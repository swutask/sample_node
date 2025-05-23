'use strict';

require('../utils').dotEnv();

const planConfig = require('../config/plans');
const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();

  for (const plan of planConfig) {
    const count = await models.plan.update({
      maxSize: plan.maxSize,
      maxBooks: plan.maxBooks,
      maxProjects: plan.maxProjects,
      recurringPeriod: plan.recurringPeriod,
      recurringPer: plan.recurringPer,
      price: plan.price,
      data: plan.data,
      pricePerMonth: plan.pricePerMonth,
      maxMembers: plan.maxMembers,
      maxClients: plan.maxClients,
      singleFileSize: plan.singleFileSize,
      maxTasks: plan.maxTasks
    }, {
      where: {
        name: plan.name
      }
    });

    console.log(count);
  }

  await sequelize.sequelize.close();
})();
