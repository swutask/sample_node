'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();
  const roleModel = models.role;
  await roleModel.create({ name: 'admin' });
  await roleModel.create({ name: 'user' });
  await sequelize.sequelize.close();
})();
