'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();
  await models.teamRole.create({ name: 'admin' });
  await models.teamRole.create({ name: 'super user' });
  await models.teamRole.create({ name: 'user' });
  await sequelize.sequelize.close();
})();
