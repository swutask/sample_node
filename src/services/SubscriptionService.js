const SubscriptionRepo = require('../repos/SubscriptionRepo');
const { CustomError } = require('../errors/CustomError');
const moment = require('moment');
const models = require('../models');

/**
 * @param teamId {number}
 * @returns {Promise<void>}
 */
async function extendTrial ({
  teamId
}) {
  const subscription = await SubscriptionRepo.getActiveSubscription({
    teamId
  }, {
    include: [{
      model: models.plan
    }]
  });

  if (!subscription) {
    throw new CustomError('Subscription was not found', 403);
  }

  if (subscription.plan.name !== 'Trial Plan') {
    throw new CustomError('Can\'t extend with non trial plan', 403);
  }

  if (!subscription.extendable) {
    throw new CustomError('Subscription has been already extended', 403);
  }

  const extendedExpireAt = moment().add(3, 'day');
  const success = await SubscriptionRepo.updateById(subscription.id, {
    expireAt: extendedExpireAt,
    extendable: false
  });

  if (!success) {
    throw new CustomError('Subscription was not extended');
  }
}

module.exports = {
  extendTrial
};
