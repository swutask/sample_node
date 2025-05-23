const { required } = require('../utils');
const models = require('../models');
const { sequelize } = require('../loaders');
const { Op } = require('sequelize');

class PrivateChatRepo {
  static async getByCreatorAndMemberIds ({
    creatorId = required(),
    memberId = required()
  }) {
    const privateChat = await models.privateChat.findOne({
      where: {
        creatorId,
        memberId
      }
    });

    return privateChat.get();
  }

  static async getByUserIds ({
    creatorId = required(),
    memberId = required()
  }) {
    const privateChat = await models.privateChat.findOne({
      where: {
        [Op.or]: [
          {
            creatorId,
            memberId
          },
          {
            creatorId: memberId,
            memberId: creatorId
          }
        ]
      }
    });

    if (!privateChat) {
      return null;
    }

    return privateChat.get();
  }

  static async create ({
    chatId = required(),
    creatorId = required(),
    memberId = required()
  }) {
    const privateChat = await models.privateChat.create({
      chatId,
      creatorId,
      memberId
    });

    return privateChat.get();
  }

  static async getWithSettingsAndOpponent ({
    userId = required()
  }) {
    const [rawResults] = await sequelize.sequelize.query(`
                SELECT private_chat.id  as "privateChatId",
                       chats.id         as "chatId",
                       chat_settings.id as "chatSettingsId",
                       opponent.id      as "opponentId",
                       user_name        as "userName",
                       first_name        as "firstName",
                       last_name        as "lastName",
                       color,
                       url,
                       muted_at         as "mutedAt",
                       creator_id       as "creatorId",
                       member_id        as "memberId",
                       (SELECT count(*)
                        FROM messages
                                 INNER JOIN message_status
                                            ON messages.id = message_status.message_id
                                                AND message_status.user_id = :userId
                        WHERE messages.chat_id = private_chat.chat_id
                            AND message_status.status = 'unread'
                            AND messages.deleted_at IS NULL) as "unreadMessageCount"
                FROM private_chat
                         LEFT JOIN chats on chats.id = private_chat.chat_id
                         LEFT JOIN chat_settings on chat_settings.id = private_chat.chat_id
                         LEFT JOIN users as opponent
                                   on opponent.id != :userId AND
                                      (opponent.id = private_chat.creator_id OR opponent.id = private_chat.member_id)
                         LEFT JOIN profiles on profiles.user_id = opponent.id
                         LEFT JOIN avatars on avatars.user_id = opponent.id
                WHERE creator_id = :userId
                   OR member_id = :userId`,
    {
      replacements: { userId },
      raw: true
    });

    return rawResults;
  }

  /**
   * @param ids {number[]}
   * @param transaction
   */
  static async permanentDeleteByIds (ids = required(), transaction = null) {
    const destroyCount = await models.privateChat.destroy({
      where: {
        id: ids
      },
      transaction
    });

    return Boolean(destroyCount);
  }

  /**
   * @param teamId {number}
   * @param transaction
   * @return {Promise<*|null>}
   */
  static async getAllIdsByTeamId (teamId = required(), transaction = null) {
    const privateChats = await models.privateChat.findAll({
      include: {
        model: models.chat,
        as: 'chat',
        where: {
          teamId
        }
      },
      transaction
    });

    if (!privateChats.length) {
      return null;
    }

    return privateChats.map(privateChat => privateChat.id);
  }
}

module.exports = PrivateChatRepo;
