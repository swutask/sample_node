const { required } = require('../utils/index');

const MessageRepo = require('../repos/MessageRepo');
const ReactionToChatMessageRepo = require('../repos/ReactionToChatMessageRepo');
const ReactionRepo = require('../repos/ReactionRepo');
const UserRepo = require('../repos/UserRepo');
const AnnotationRepo = require('../repos/AnnotationRepo');
const SocketNotifyService = require('./SocketNotifyService');
const { CustomError } = require('../errors/CustomError');
const ActivityProducerService = require('./ActivityProducerService');

class MessageService {
  static async addReaction ({
    messageId = required(),
    reactionId = required(),
    userId = required(),
    teamId = required()
  }) {
    const message = await MessageRepo.getById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    await ReactionToChatMessageRepo.create({
      reactionId,
      userId,
      messageId
    });

    const reaction = await ReactionRepo.getById(reactionId);
    const uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId);
    uniqueUserIds.forEach((uniqueUserId) =>
      SocketNotifyService.notify({
        userId: uniqueUserId,
        name: 'reactionToChatMessage',
        payload: {
          messageId,
          userId,
          type: 'create',
          value: reaction
        }
      })
    );
  }

  static async removeReaction ({
    messageId = required(),
    reactionId = required(),
    userId = required(),
    teamId = required()
  }) {
    const success = await ReactionToChatMessageRepo.deleteByUniqIds({
      reactionId,
      userId,
      messageId
    });

    if (!success) {
      throw new Error('Reaction was not deleted');
    }

    const uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId);
    uniqueUserIds.forEach((uniqueUserId) =>
      SocketNotifyService.notify({
        userId: uniqueUserId,
        name: 'reactionToChatMessage',
        payload: {
          messageId,
          reactionId,
          userId,
          type: 'delete'
        }
      })
    );
  }

  /**
   * @param messageId {number}
   * @param userId {number}
   * @param resolvedAt {Date | null}
   * @returns {Promise<void>}
   */
  static async updateResolve ({
    messageId,
    userId,
    resolvedAt
  }) {
    const message = await MessageRepo.getByIdWithAnnotation(messageId);

    if (!message) {
      throw new CustomError('Not found', 404);
    }

    const success = await MessageRepo.updateById(messageId, {
      resolvedAt
    });

    if (!success) {
      throw new CustomError('Message was not updated');
    }

    if (!message.annotation && !message.threadId) {
      await ActivityProducerService.sendMessage({
        from: {
          resolvedAt: message.resolvedAt
        },
        to: {
          id: messageId,
          resolvedAt
        },
        creatorId: userId,
        type: 'book',
        entity: 'chatMessage'
      });
    }

    if (message.threadId) {
      await this.updateResolve({
        messageId: message.threadId,
        userId,
        resolvedAt
      });
    }

    if (message.annotation) {
      const success = await AnnotationRepo.updateById(message.annotation.id, {
        resolvedAt
      });

      if (success) {
        await ActivityProducerService.sendMessage({
          from: {
            resolvedAt: message.annotation.resolvedAt
          },
          to: {
            id: message.annotation.id,
            resolvedAt
          },
          creatorId: userId,
          type: 'book',
          entity: 'annotation'
        });
      }
    }
  }
}

module.exports = MessageService;
