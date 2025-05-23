const models = require('../models/index');

/**
 * @param data {{
 *   userId: number
 * }}
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @returns {Promise<void>}
 */
async function create (data = {}, options = {
  transaction: null
}) {
  await models.onboarding.create(data, {
    transaction: options.transaction
  });
}

/**
 * @param userId {number}
 * @param data {Object}
 * @returns {Promise<*|null>}
 */
async function updateByUserId (userId, data) {
  const [count, updatedOnboardings] = await models.onboarding.update(data, {
    where: {
      userId
    },
    returning: true
  });

  if (!count) {
    return null;
  }

  const [updatedOnboarding] = updatedOnboardings;

  return updatedOnboarding.get();
}

module.exports = {
  create,
  updateByUserId
};
