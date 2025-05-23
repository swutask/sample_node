'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');
const colors = require('../core/colors.json');
const lastColorIndex = colors.length - 1;

(async _ => {
  await sequelize.loadModels();
  const profiles = await models.profile.findAll();

  for (const profile of profiles) {
    await models.profile.update({
      color: colors[Math.floor(Math.random() * lastColorIndex)]
    }, {
      where: {
        id: profile.id
      }
    });
  }

  await sequelize.sequelize.close();
})();
