// DEPRECATED
const { required } = require('../utils');
const DiscountRepo = require('../repos/DiscountRepo');
const { stripe } = require('../libs');
const StripeUserRepo = require('../repos/StripeUserRepo');

/**
 * @param teamId {number}
 * @param type {'coupon' | 'credit'}
 * @param data {
 * amountInUSDCents {number}
 * amountOff {number}
 * appliesTo {products: Array<string>}
 * currency {string}
 * duration {'forever' | 'once' | 'repeating'}
 * durationInMonths {number}
 * expand {Array<string>}
 * id {string}
 * maxRedemptions {number}
 * name {string}
 * percentOff {number}
 * redeemBy {number}
 * }

 * @returns {Promise<* | null>}
 */
function create ({
  teamId = required(),
  type = required(),
  data = required(),
  appliesToPlan
}) {
  switch (type) {
    case 'coupon' : {
      return createCouponDiscount({
        data,
        teamId,
        type,
        appliesToPlan
      });
    }

    case 'credit' : {
      return createCreditDiscount({
        amountInUSDCents: data.amountInUSDCents,
        teamId,
        type
      });
    }

    default: {
      return null;
    }
  }
}

/**
 * @param data {
 * amountInUSDCents {number}
 * amountOff {number}
 * appliesTo {products: Array<string>}
 * currency {string}
 * duration {'forever' | 'once' | 'repeating'}
 * durationInMonths {number}
 * expand {Array<string>}
 * id {string}
 * maxRedemptions {number}
 * name {string}
 * percentOff {number}
 * redeemBy {number}
 * }
 * @param teamId {number}
 * @param type {string}
 * @returns {Promise<*|null>}
 */
async function createCouponDiscount ({
  data,
  teamId,
  type,
  appliesToPlan
}) {
  const couponId = await stripe.createCoupon({
    privateKey: process.env.STRIPE_SECRET,
    data
  });

  return DiscountRepo.create({
    teamId,
    type,
    appliesTo: appliesToPlan,
    amount: 0,
    externalId: couponId
  });
}

/**
 * @param amountInUSDCents {number}
 * @param teamId {number}
 * @param type {string}
 * @returns {Promise<*|null>}
 */
async function createCreditDiscount ({
  amountInUSDCents,
  teamId,
  type
}) {
  const stripeUser = await StripeUserRepo.getStripeUser({ teamId });

  if (!stripeUser?.stripeId) {
    return null;
  }

  await stripe.updateBalance({
    privateKey: process.env.STRIPE_SECRET,
    customerId: stripeUser.stripeId,
    amountInUSDCents
  });

  return DiscountRepo.create({
    teamId,
    type,
    amount: amountInUSDCents
  });
}

module.exports = {
  create
};
