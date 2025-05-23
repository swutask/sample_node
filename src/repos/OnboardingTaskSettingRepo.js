const models = require('../models/index');

/**
 * @param data {{
 *   teamId: number
 * }}
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @returns {Promise<void>}
 */
async function create (data = {}, options = {
  transaction: null
}) {
  await models.onboardingTaskSetting.create(data, {
    transaction: options.transaction
  });
}

/**
 * @param teamId {number}
 * @param data {Object}
 * @returns {Promise<*|null>}
 */
async function updateByTeamId (teamId, data) {
  const [count, updatedOnboardingTaskSettings] = await models.onboardingTaskSetting.update(data, {
    where: {
      teamId
    },
    returning: true
  });

  if (!count) {
    return null;
  }

  const [updatedOnboardingTaskSetting] = updatedOnboardingTaskSettings;

  return updatedOnboardingTaskSetting.get();
}

/**
 * @param teamId {number}
 * @returns {Promise<*|null>}
 */
async function getByTeamId (teamId) {
  const updatedOnboardingTaskSetting = await models.onboardingTaskSetting.findOne({
    where: {
      teamId
    }
  });

  if (!updatedOnboardingTaskSetting) {
    return null;
  }

  return updatedOnboardingTaskSetting.get();
}

module.exports = {
  create,
  updateByTeamId,
  getByTeamId
};
