const models = require('../models');

/**
 * @param data {{
 *   teamId: number,
 *   type: 'coupon' | 'credit',
 *   amount: number,
 *   appliesTo?: string
 *   externalId: string
 * }}
 * @returns {Promise<*|null>}
 */
async function create (data) {
  const coupon = await models.discount.create(data);

  if (!coupon) {
    return null;
  }

  return coupon.get();
}

/**
 * @param teamId {number}
 * @param type {'coupon' | 'credit'}
 * @returns {Promise<*|null>}
 */
async function getByTeamIdAndType (teamId, type) {
  const coupon = await models.discount.findOne({
    where: {
      teamId,
      type
    },
    order: [['createdAt', 'DESC']]
  });

  if (!coupon) {
    return null;
  }

  return coupon.get();
}

async function getAllByTeamIdAndType (teamId, type) {
  const coupons = await models.discount.findAll({
    where: {
      teamId,
      type
    },
    order: [['createdAt', 'DESC']]
  });

  return coupons.map(c => c.get());
}

module.exports = {
  create,
  getByTeamIdAndType,
  getAllByTeamIdAndType
};
