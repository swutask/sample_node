'use strict';
const models = require('../models');
const { required } = require('../utils');
// const { Op } = require('sequelize');
const { sequelize } = require('../loaders');
const SocketNotifyService = require('./SocketNotifyService');
const NotificationService = require('./NotificationService');
const NotificationCodes = require('../core/NotificationCodes.js');
const { elasticsearch } = require('../libs');
const {
  UserRepo,
  ChatRepo
} = require('../repos/index');
const AttachmentRepo = require('../repos/AttachmentRepo');
const ActivityProducerService = require('./ActivityProducerService');
const TaskSubscriptionRepo = require('../repos/TaskSubscriptionRepo');
const MessageStatusRepo = require('../repos/MessageStatusRepo');
const MessageRepo = require('../repos/MessageRepo');
const Sequelize = require('sequelize');

class ChatService {
  static async createMessageInTransaction ({
    userId,
    messageData,
    chatId,
    transaction,
    relatedUserIds,
    attachmentIds
  }) {
    const createdMessage = await models.message.create({
      ...messageData,
      userId
    }, {
      transaction
    });

    const messageStatusCreateData = relatedUserIds.map((relatedUserIds) => {
      let status = 'unread';

      if (userId === relatedUserIds) {
        status = 'read';
      }

      return {
        userId: relatedUserIds,
        messageId: createdMessage.id,
        chatId: chatId,
        status: status
      };
    });

    const createdStatuses = await MessageStatusRepo.bulkCreate(messageStatusCreateData, {
      transaction
    });

    if (attachmentIds.length) {
      await models.attachment.update({
        messageId: createdMessage.id
      }, {
        where: {
          id: attachmentIds
        },
        transaction
      });
    }

    return {
      createdMessageId: createdMessage.id,
      createdStatuses
    };
  }

  static async addMessage ({
    userId = required(),
    chatId = required(),
    text = required(),
    attachmentIds = [],
    notifyActivity = true,
    annotation = null,
    taskId,
    teamId,
    bookId,
    replyId,
    threadId,
    resolvedAt
  }) {
    const chat = await ChatRepo.getById(chatId);

    if (!chat) {
      throw new Error('Chat not found');
    }

    let relatedUserIds = [userId];
    let privateChat = null;

    if (teamId) {
      privateChat = await models.privateChat.findOne({
        where: {
          chatId: chatId
        }
      });

      if (privateChat) {
        relatedUserIds = [privateChat.creatorId, privateChat.memberId];
      } else {
        relatedUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId, bookId, null);

        if (!relatedUserIds.length) {
          throw new Error('Permission denied');
        }
      }
    }

    const messageData = {
      text,
      chatId,
      replyId,
      resolvedAt,
      threadId
    };
    const { createdMessageId, createdStatuses } = await sequelize.sequelize.transaction(
      t => this.createMessageInTransaction({
        messageData,
        transaction: t,
        userId,
        chatId,
        attachmentIds,
        relatedUserIds
      })
    );

    if (teamId && privateChat) {
      let targetUserId = privateChat?.memberId;

      if (userId !== privateChat?.creatorId) {
        targetUserId = privateChat?.creatorId;
      }

      await NotificationService.createNotification({
        userId,
        targetUserId,
        teamId,
        chatId,
        chatMessageId: createdMessageId,
        title: NotificationCodes.NEW_PRIVATE_MESSAGE
      });
    }

    const msgModel = await models.message.findOne({
      where: {
        id: createdMessageId
      },
      include: [
        {
          model: models.messageStatus,
          where: {
            userId: userId
          }
        },
        {
          model: models.attachment,
          // TODO move to constant
          attributes: ['id', 'url', 'name', 'mimeType', 'key', 'size', 'order'],
          include: {
            model: models.attachment,
            as: 'subversion',
            include: {
              model: models.chat
            }
          }
        },
        {
          model: models.user,
          attributes: ['id'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        },
        {
          model: models.message,
          as: 'reply',
          include: [
            {
              model: models.attachment,
              // TODO move to constant
              attributes: ['id', 'url', 'name', 'mimeType', 'key', 'size', 'order'],
              include: {
                model: models.attachment,
                as: 'subversion',
                include: {
                  model: models.chat
                }
              }
            }
          ]
        }
      ]
    });
    const msg = msgModel.get();

    if (!msg) {
      throw new Error('Message was not created');
    }

    msg.annotation = annotation;

    let subtype = 'default';

    if (privateChat) {
      subtype = 'privateChat';
    } else if (
      chat.teamId &&
      chat.bookId &&
      !chat.taskId
    ) {
      subtype = 'book';
    }

    for (const createdStatus of createdStatuses) {
      SocketNotifyService.notify({
        userId: createdStatus.userId,
        name: 'chat',
        payload: {
          type: 'addMessage',
          subtype,
          message: {
            ...msg,
            messageStatus: createdStatus
          }
        }
      });
    }

    await elasticsearch.updateById({
      id: msg.id,
      obj: msg,
      modelName: 'message',
      upsert: true
    });

    if (!notifyActivity) {
      return msg;
    }

    if (chat.taskId) {
      await TaskSubscriptionRepo.create({
        taskId: chat.taskId,
        userId
      });
      await ActivityProducerService.sendMessage({
        from: {
          messageId: null
        },
        to: {
          id: taskId,
          messageId: msg.id
        },
        creatorId: userId,
        type: 'task',
        entity: 'task'
      });
    } else if (threadId) {
      await ActivityProducerService.sendMessage({
        from: null,
        to: {
          id: msg.id,
          threadId
        },
        creatorId: userId,
        type: 'book',
        entity: 'chatMessage'
      });
    }

    return msg;
  };

  static async getMessages ({
    userId = required(),
    chatId = required(),
    bookId = null,
    threadId = null,
    teamId,
    limit,
    page
  } = {}) {
    const offset = limit * page;

    let member = null;

    const where = {
      chatId: chatId,
      threadId
    };

    if (teamId) {
      const teamAccessWhere = {
        userId,
        teamId,
        projectId: null
      };

      if (bookId) {
        teamAccessWhere.bookId = bookId;
      }

      member = await models.teamAccess.findOne({
        where: teamAccessWhere
      });

      if (!member) {
        throw new Error('Permission denied');
      }

      // where.createdAt = {
      //   [Op.gte]: member.createdAt
      // };
    }

    const chat = await models.chat.findByPk(chatId);

    if (!chat) {
      throw new Error('Chat not found');
    }

    const result = await models.message.findAndCountAll({
      where: where,
      attributes: {
        include: [[
          Sequelize.literal(`
            (SELECT COUNT(*)
              FROM messages as msg
              WHERE msg.thread_id = "message"."id"
              AND msg.deleted_at IS NULL)
           `),
          'threadCount'
        ]]
      },
      include: [
        {
          model: models.reaction
        },
        {
          model: models.message,
          as: 'reply',
          include: {
            model: models.attachment,
            // TODO move to constant
            attributes: ['id', 'url', 'name', 'mimeType', 'key', 'size', 'order'],
            includes: {
              model: models.attachment,
              as: 'subversion',
              include: {
                model: models.chat
              }
            }
          }
        },
        {
          model: models.messageStatus,
          where: {
            userId: userId
          },
          required: false
        },
        {
          model: models.attachment,
          attributes: {
            include: [[
              Sequelize.literal(`
            (SELECT count(*)
              FROM messages
                       INNER JOIN chats c ON c.id = messages.chat_id
                       INNER JOIN attachments a ON c.attachment_id = a.id
                  AND a.original_id = "attachments".id
                  AND a.version = (SELECT max(version) FROM attachments as v WHERE v.original_id = "attachments".id)
              WHERE messages.deleted_at IS NULL)
           `),
              'subversionMessageCount'
            ]]
          },
          include: [
            {
              model: models.chat,
              attributes: {
                include: [[
                  Sequelize.literal(`
              (SELECT COUNT(*)
                FROM messages
                WHERE messages.chat_id = "attachments->chat"."id"
                AND messages.deleted_at IS NULL)
              `),
                  'messageCount'
                ]]
              }
            },
            {
              model: models.attachment,
              as: 'subversion',
              include: {
                model: models.chat
              }
            }
          ]
        },
        {
          model: models.user,
          attributes: ['id'],
          required: true,
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        },
        {
          model: models.annotation
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    const messages = result.rows.map(m => m.get());

    const reactions = await models.reactionToChatMessage.findAll({
      where: {
        messageId: messages.map(item => item.id)
      },
      include: {
        model: models.user,
        attributes: ['id'],
        include: [{
          model: models.profile,
          attributes: ['firstName', 'lastName', 'color']
        },
        {
          model: models.avatar,
          attributes: ['url']
        }]
      }
    });

    return {
      messages,
      reactions,
      count: result.count
    };
  }

  static async updateMessageStatus ({
    userId = required(),
    chatId = required()
  } = {}) {
    await models.messageStatus.update(
      {
        status: 'read'
      },
      {
        where: {
          chatId,
          userId,
          status: 'unread'
        }
      }
    );
  }

  static async updateMute ({
    chatId = required(),
    userId = required(),
    mutedAt = required()
  }) {
    const count = await models.chatSetting.update({
      mutedAt: mutedAt
    }, {
      where: {
        chatId: chatId,
        userId
      }
    });

    if (count[0] === 0) throw new Error('Chat not found!');
  }

  static async deleteMessage ({
    id = required(),
    userId = required(),
    chatId = required(),
    teamId,
    bookId
  } = {}) {
    const success = await MessageRepo.permanentDeleteByIdUserAndChatIds(id, userId, chatId);

    if (!success) {
      throw new Error('Message not found');
    }

    // TODO move to separate function
    if (teamId) {
      const privateChat = await models.privateChat.findOne({
        where: {
          chatId: chatId
        }
      });

      let uniqueUserIds = [];

      if (privateChat) {
        uniqueUserIds = [privateChat.creatorId, privateChat.memberId];
      } else {
        // TODO refactor
        const where = { teamId, projectId: null };

        if (bookId) {
          where.bookId = bookId;
        }

        const members = await models.teamAccess.findAll({
          where
        });

        if (members.length === 0) {
          throw new Error('Permission denied');
        }

        const userIds = members.map(access => access.userId);
        uniqueUserIds = [...new Set(userIds)];
      }

      for (const uniqueUserId of uniqueUserIds) {
        if (uniqueUserId === userId) {
          continue;
        }

        SocketNotifyService.notify({
          userId: uniqueUserId,
          name: 'chat',
          payload: {
            bookId: bookId,
            type: 'deleteMessage',
            value: {
              chatId,
              id
            }
          }
        });
      }
    }
  }

  static async updateMessage ({
    id = required(),
    text,
    attachmentIds = [],
    teamId,
    userId = required(),
    bookId,
    chatId = required(),
    replyId,
    threadId,
    resolvedAt
  } = {}) {
    if (attachmentIds.length) {
      const attachmentIdsWithChat = await AttachmentRepo.getAllIdsByIdWithChat(attachmentIds);

      if (attachmentIdsWithChat) {
        throw new Error(`Attachments shod not have chats: ${attachmentIdsWithChat}`);
      }

      const [updatedAttachmentsCount] = await models.attachment.update({
        messageId: id
      }, {
        where: {
          id: attachmentIds
        }
      });

      if (!updatedAttachmentsCount) {
        throw new Error('Attachments not found');
      }
    }

    const count = await models.message.update({
      text,
      replyId,
      threadId,
      resolvedAt
    }, {
      where: {
        userId,
        chatId,
        id
      }
    });

    if (count[0] === 0) throw new Error('Message not found');

    await elasticsearch.updateById({
      id: id,
      obj: {
        text
      },
      modelName: 'message'
    });

    // TODO move to separate function
    if (teamId) {
      const privateChat = await models.privateChat.findOne({
        where: {
          chatId: chatId
        }
      });

      let uniqueUserIds = [];

      if (privateChat) {
        uniqueUserIds = [privateChat.creatorId, privateChat.memberId];
      } else {
        const where = { teamId, projectId: null };

        if (bookId) where.bookId = bookId;

        const members = await models.teamAccess.findAll({
          where
        });

        if (members.length === 0) throw new Error('Permission denied');

        const userIds = members.map(access => access.userId);
        uniqueUserIds = [...new Set(userIds)];
      }

      for (const uniqueUserId of uniqueUserIds) {
        if (uniqueUserId !== userId) {
          SocketNotifyService.notify({
            userId: uniqueUserId,
            name: 'chat',
            payload: {
              bookId: bookId,
              type: 'updateMessage',
              value: {
                id,
                text
              }
            }
          });
        }
      }
    }
  }

  /**
   * @param teamId {number}
   * @param userId {number}
   * @returns {Promise<*[]>}
   */
  static getBookChats ({
    teamId,
    userId
  }) {
    return ChatRepo.getByTeamAndUserIdWithBook(teamId, userId);
  }

  /**
   * @param userId {number}
   * @param teamId {number}
   * @returns {Promise<number>}
   */
  static async getUnreadCount ({
    userId,
    teamId
  }) {
    const bookChatsCount = await MessageRepo.getUnreadCountForBookByUserAndTeamId(userId, teamId);
    const privateChatsCount = await MessageRepo.getUnreadCountForPrivateByUserAndTeamId(userId, teamId);

    return bookChatsCount + privateChatsCount;
  }
}

module.exports = ChatService;
