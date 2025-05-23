const {
  required,
  generateWhereCondition
} = require('../utils/index');
const models = require('../models');

class ReactionToChatMessageRepo {
  /**
   * @param createData {{
   *  userId: number | null,
   *  reactionId: number | null
   * }}
   * @return {Promise<any>}
   */
  static create (createData = required()) {
    return models.reactionToChatMessage.create(createData);
  }

  /**
   * @param uniqIds {{
   *   userId: number,
   *   reactionId: number,
   *   messageId: number | number[]
   * }}
   * @return {Promise<any>}
   */
  static async deleteByUniqIds (uniqIds = required()) {
    const where = generateWhereCondition(uniqIds, {
      allowEmptyCondition: false
    });

    const count = await models.reactionToChatMessage.destroy({
      where,
      force: true
    });

    return Boolean(count);
  }
}

module.exports = ReactionToChatMessageRepo;
