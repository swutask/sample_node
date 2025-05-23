const models = require('../models');
const Sequelize = require('sequelize');

class ChatRepo {
  /**
   * @param bookId {number | null}
   * @param teamId {number | null}
   * @param taskId {number | null}
   * @param transaction {any | null}
   * @return {Promise<number[] | null>}
   */
  static async create ({
    bookId = null,
    teamId = null,
    taskId = null
  }, transaction = null) {
    const chat = await models.chat.create({
      bookId,
      teamId,
      taskId
    }, {
      transaction
    });

    return chat.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getById (id) {
    const chat = await models.chat.findOne({
      where: {
        id
      }
    });

    if (!chat) {
      return null;
    }

    return chat.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getByIdWithRelated (id) {
    const chat = await models.chat.findOne({
      where: {
        id
      },
      include: [
        {
          model: models.attachment
        }
      ]
    });

    if (!chat) {
      return null;
    }

    return chat.get();
  }

  /**
   * @param teamId {number}
   * @param userId {number}
   * @returns {Promise<any[]>}
   */
  static async getByTeamAndUserIdWithBook (teamId, userId) {
    const chats = await models.chat.findAll({
      attributes: {
        include: [[
          Sequelize.literal(`
            (SELECT count(*)
                FROM messages
                  INNER JOIN message_status
                    ON messages.id = message_status.message_id
                      AND message_status.user_id = :userId
                WHERE messages.chat_id = chat.id
                  AND message_status.status = 'unread')
           `),
          'unreadMessageCount'
        ]]
      },
      include: [{
        model: models.book,
        where: {
          teamId,
          archivedAt: null
        }
      }, {
        model: models.message,
        include: [
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
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 1
      }],
      replacements: {
        userId
      }
    });

    return chats.map((chat) => chat.get());
  }

  static async getLatestMessageByChatId (chatId) {
    return models.message.findAll({
      where: {
        chatId
      },
      include: [
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
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 1
    });
  }
}

module.exports = ChatRepo;
