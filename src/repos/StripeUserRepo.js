const { required } = require('../utils/index');
const models = require('../models');

class StripeUserRepo {
  /**
   * @param data {
   *  teamId: number,
   *  stripeId: string
   * }
   * @param transaction
   * @return {Promise<string | null>}
   */
  static async createStripeUser ({
    teamId = required(),
    stripeId = required()
  }, transaction = null) {
    const stripeUser = await models.stripeUser.create({
      teamId,
      stripeId
    }, {
      transaction
    });

    return stripeUser;
  }

  /**
   * @param where {
   *  teamId: number,
   *  stripeId: string
   * }
   * @param transaction
   * @return {Promise<string | null>}
   */
  static async getStripeUser (where = required(), transaction = null) {
    const stripeUser = await models.stripeUser.findOne({
      where,
      transaction
    });

    if (!stripeUser) {
      return null;
    }

    return stripeUser.get();
  }

  /**
   * @param where {
   *  teamId: number,
   *  stripeId: string
   * }
   * @param transaction
   * @return {Promise<string | null>}
   */
  static async destroyStripeUser (teamId = required(), transaction = null) {
    await models.stripeUser.destroy({
      where: {
        teamId
      },
      force: true,
      paranoid: false,
      transaction
    });
  }
}

module.exports = StripeUserRepo;
