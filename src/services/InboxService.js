const { required } = require('../utils');
const InboxRepo = require('../repos/InboxRepo');

class InboxService {
  /**
   * @param userId {number}
   * @param data {Object}
   * @return {Promise<Array<unknown>>}
   */
  static async update (
    { userId = required(), data = required() }
  ) {
    return InboxRepo.updateByUserId({
      userId, data
    });
  }

  /**
   * @param userId {number}
   * @return {Promise<Array<unknown>>}
   */
  static async get (
    { userId = required() }
  ) {
    return InboxRepo.getByUserId(userId);
  }
}

module.exports = InboxService;
