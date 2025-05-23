const { required } = require('../utils/index');
const models = require('../models');

class ReactionRepo {
  /**
   * @param id {number}
   * @return {Promise<any>}
   */
  static async getById (id = required()) {
    const reaction = await models.reaction.findByPk(id);

    return reaction.get();
  }

  /**
   * @return {Promise<any>}
   */
  static async getReactions () {
    return models.reaction.findAll();
  }
}

module.exports = ReactionRepo;
