'use strict';

require('../utils').dotEnv();

const planConfig = require('../config/plans');
const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();

  await models.plan.bulkCreate(planConfig, {
    ignoreDuplicates: true
  });

  await sequelize.sequelize.close();
})();
