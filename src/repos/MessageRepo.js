const { required } = require('../utils/index');
const models = require('../models/index');
const { Op } = require('sequelize');

class MessageRepo {
  /**
   * @param id {number}
   * @return {Promise<any | null>}
   */
  static async getById (id = required()) {
    const message = await models.message.findOne({
      where: {
        id
      }
    });

    if (!message) {
      return null;
    }

    return message.get();
  }

  /**
   * @param id {number}
   * @return {Promise<any | null>}
   */
  static async getByIdWithAnnotation (id = required()) {
    const message = await models.message.findOne({
      where: {
        id
      },
      include: {
        model: models.annotation
      }
    });

    if (!message) {
      return null;
    }

    return message.get();
  }

  /**
   * @param id {number}
   * @param updateData {*}
   * @returns {Promise<boolean>}
   */
  static async updateById (id, updateData) {
    const count = await models.message.update(updateData, {
      where: {
        id
      }
    });

    return Boolean(count);
  }

  /**
   * @param id {number}
   * @param userId {number}
   * @param chatId {number}
   * @returns {Promise<boolean>}
   */
  static async permanentDeleteByIdUserAndChatIds (id, userId, chatId) {
    const count = await models.message.destroy({
      where: {
        id,
        userId,
        chatId
      },
      force: true
    });

    return Boolean(count);
  }

  /**
   * @param userId {number}
   * @param teamId {number}
   * @returns {Promise<number>}
   */
  static async getUnreadCountForBookByUserAndTeamId (userId, teamId) {
    return models.message.count({
      include: [
        {
          model: models.chat,
          where: {
            teamId,
            bookId: {
              [Op.ne]: null
            }
          }
        },
        {
          model: models.messageStatus,
          where: {
            userId,
            status: 'unread'
          }
        }
      ]
    });
  }

  /**
   * @param userId {number}
   * @param teamId {number}
   * @returns {Promise<number>}
   */
  static async getUnreadCountForPrivateByUserAndTeamId (userId, teamId) {
    return models.message.count({
      include: [
        {
          model: models.chat,
          where: {
            teamId
          },
          include: {
            model: models.privateChat,
            where: {
              [Op.or]: [
                {
                  creatorId: userId
                },
                {
                  memberId: userId
                }
              ]
            }
          }
        },
        {
          model: models.messageStatus,
          where: {
            userId,
            status: 'unread'
          }
        }
      ]
    });
  }
}

module.exports = MessageRepo;
