'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');
const { Op } = require('sequelize');

async function main () {
  await sequelize.loadModels();

  const freePlan = await models.plan.findOne({
    where: {
      name: 'Free Plan'
    },
    attributes: ['id']
  });

  const trialPlan = await models.plan.findOne({
    where: {
      name: 'Trial Plan'
    },
    attributes: ['id']
  });

  await models.subscription.update({
    planId: freePlan.id,
    expireAt: null
  }, {
    where: {
      teamId: {
        [Op.ne]: null
      },
      planId: trialPlan.id
    }
  });

  await sequelize.sequelize.close();
  process.exit();
}
main();
