const models = require('../models');
const { required } = require('../utils');
const { stripe } = require('../libs');
const log = require('../log')('SubscriptionRepo');

class SubscriptionRepo {
  static async checkIsFreePlan (teamId) {
    const sub = await SubscriptionRepo.getActiveSubscription({
      teamId,
      isActive: true,
      isCancelled: false
    }, {
      include: [{
        model: models.plan,
        required: true
      }]
    });

    return sub.plan.name === 'Free Plan';
  }

  /**
   * @param data {{
   *  expireAt: Date,
   *  planId: number,
   *  teamId: number,
   *  data: {
   *    subscriptionId: string
   *  }
   * }}
   * @param transaction
   * @returns {Promise<boolean>}
   */
  static async createSubscription (data, transaction) {
    const sub = await models.subscription.create(data, {
      transaction
    });

    return sub;
  }

  /**
   * @param where {{
   *  teamId: number
   *  isCanceled: boolean
   * }}
   * @param options {{
   *  include: array
   *  attributes: array
   * }}
   * @return {Promise<* | null>}
   */
  static async getActiveSubscription (where, options) {
    const include = options?.include || [];
    const attributes = options?.attributes || undefined;

    const sub = await models.subscription.findAll({
      where: {
        isActive: true,
        ...where
      },
      include,
      attributes,
      limit: 1,
      order: [
        ['id', 'desc']
      ]
    });

    if (sub.length === 0) throw new Error('No active subscription');

    const s = sub[0];

    return s;
  }

  /**
   * @param id {number}
   * @param updateData {*}
   * @returns {Promise<boolean>}
   */
  static async updateById (id, updateData) {
    const [affectedCount] = await models.subscription.update(updateData, {
      where: {
        id
      }
    });

    return Boolean(affectedCount);
  }

  /**
   * @param updateData {{
   *  expireAt: Date,
   *  extendable: boolean,
   *  isActive: boolean,
   *  isCancelled: boolean
   * }}
   * @param where {{
   *  teamId: number,
   *  userId: number,
   *  id: number,
   * }}
   * @returns {Promise<boolean>}
   */
  static async updateSubscription (updateData, where) {
    const [affectedCount] = await models.subscription.update(updateData, {
      where: where
    });

    return Boolean(affectedCount);
  }

  static async upgradeToTeamPlan ({
    teamId = required(),
    quantity = required()
  } = {}) {
    const sub = await SubscriptionRepo.getActiveSubscription({ teamId });

    const plans = await models.plan.findAll();

    let currentPlan = null;
    let teamMonthlyPlan = null;
    let teamYearlyPlan = null;

    currentPlan = plans.find(plan => plan.id === sub.planId);
    teamMonthlyPlan = plans.find(plan => plan.name === 'Team Plan Monthly');
    teamYearlyPlan = plans.find(plan => plan.name === 'Team Plan Yearly');

    if (currentPlan?.name === 'Personal Pro Plan Yearly' || currentPlan?.name === 'Personal Pro Plan Monthly') {
      const newPlan = currentPlan.name === 'Personal Pro Plan Monthly' ? teamMonthlyPlan : teamYearlyPlan;

      const subscriptionId = sub.data.subscriptionId;

      const data = await stripe.updateSubscription({
        privateKey: process.env.STRIPE_SECRET,
        subscriptionId: subscriptionId,
        prorationBehavior: 'create_prorations',
        quantity,
        newPriceId: newPlan.data.priceId
      });

      const date = new Date();
      if (newPlan.recurringPer === 'month') {
        date.setMonth(date.getMonth() + newPlan.recurringPeriod);
      } else if (newPlan.recurringPer === 'year') {
        date.setFullYear(date.getFullYear() + newPlan.recurringPeriod);
      }

      try {
        sub.isCancelled = true;
        sub.isActive = false;
        await sub.save();

        await SubscriptionRepo.createSubscription({
          planId: newPlan.id,
          teamId: teamId,
          expireAt: date,
          data: {
            subscriptionId: data.id
          }
        });
      } catch (error) {
        log('changePlan', error);
      }
    }
  }
}

module.exports = SubscriptionRepo;
