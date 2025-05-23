const models = require('../models');
const { required } = require('../utils/index');

class FilterRepo {
  /**
   * @param userId {number}
   * @return {Promise}
   */
  static async getAllByUserId (userId = required()) {
    return await models.filter.findAll({
      where: {
        userId
      },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
  }

  /**
   * @param userId {number}
   * @param bookId {number | null}
   * @param taskFilter {string | null}
   * @param transaction
   * @return {Promise<boolean>}
   */
  static async create ({
    userId = null,
    bookId = null,
    taskFilter,
    name = required(),
    transaction
  } = {}) {
    return models.filter.create({
      name,
      task: taskFilter,
      userId: userId,
      bookId: bookId
    }, {
      transaction
    });
  }

  /**
   * @param userId {number}
   * @param bookId {number}
   * @param taskFilter {string}
   * @return {Promise<boolean>}
   */
  static async update ({
    userId = required(),
    id = required(),
    bookId = null,
    name,
    taskFilter
  } = {}) {
    const [affected] = await models.filter.update({
      task: taskFilter,
      name
    }, {
      where: {
        id,
        userId: bookId ? null : userId,
        bookId
      }
    });

    return Boolean(affected);
  }

  /**
   * @param userId {number}
   * @param bookId {number}
   * @param taskFilter {string}
   * @return {Promise<boolean>}
   */
  static async delete ({
    userId = required(),
    id = required(),
    bookId = null
  } = {}) {
    const count = await models.filter.destroy({
      where: {
        id,
        userId: bookId ? null : userId,
        bookId
      },
      force: true
    });

    return Boolean(count);
  }
}

module.exports = FilterRepo;
