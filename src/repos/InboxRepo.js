const { required } = require('../utils');
const models = require('../models');

class InboxRepo {
  /**
   * @param userId {number}
   * @param data {Object}
   * @return {Promise<*|null>}
   */
  static async updateByUserId ({
    userId = required(),
    data = required()
  }) {
    const [count, updatedInboxes] = await models.inbox.update(data, {
      returning: true,
      where: {
        userId
      }
    });

    if (!count) {
      return null;
    }

    const [updatedInbox] = updatedInboxes;

    return updatedInbox.get();
  }

  /**
   * @param userId {number}
   * @return {Promise<*>}
   */
  static async getByUserId (userId = required()) {
    const inbox = await models.inbox.findOne({
      where: {
        userId
      }
    });

    return inbox?.get();
  }

  /**
   * @param userIds {number[]}
   * @return {Promise<*[]>}
   */
  static async getAllByUserIds (userIds = required()) {
    const inboxes = await models.inbox.findAll({
      where: {
        userId: userIds
      }
    });

    return inboxes.map((inbox) => inbox.get());
  }

  /**
   * @param userIds {number}
   * @return {Promise<number[]>}
   */
  static async getByUserIds (userIds = required()) {
    const inboxes = await models.inbox.findAll({
      where: {
        userId: userIds
      },
      attributes: ['id', 'userId']
    });

    return inboxes.map((inbox) => inbox.get());
  }
}

module.exports = InboxRepo;
