const { required } = require('../utils/index');
const models = require('../models');

/**
 * @param id {number}
 * @return {Promise<* | null>}
 */
async function getById (id = required()) {
  const plan = await models.plan.findByPk(id);

  if (!plan) {
    return null;
  }

  return plan.get();
}

module.exports = {
  getById
};
