'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');
const planConfig = require('../config/plans');

async function main () {
  await sequelize.loadModels();
  const existPlans = await models.plan.findAll({
    attributes: ['name']
  });
  const existPlanNames = existPlans.map((plan) => plan.name);
  const plansToAdd = planConfig.filter((configPlan) => !existPlanNames.includes(configPlan.name));

  if (!plansToAdd.length) {
    process.exit();
  }

  await models.plan.bulkCreate(plansToAdd);

  process.exit();
}
main();
