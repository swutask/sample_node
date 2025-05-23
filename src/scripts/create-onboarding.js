'use strict';

require('../utils').dotEnv();
const { sequelize } = require('../loaders');
const models = require('../models');
const { Op } = require('sequelize');
(async _ => {
  await sequelize.loadModels();
  try {
    let count = 1000;
    const limit = 1000;
    let offset = 0;

    console.time('all');
    while (count === limit) {
      console.time(`time-${offset}`);
      console.time(`select-${offset}`);

      const users = await models.user.findAll({
        include: {
          model: models.profile,
          where: {
            firstName: { [Op.ne]: 'firstName' }
          }
        }
      });

      const managersBulk = [];

      for (const user of users) {
        managersBulk.push({
          userId: user.id
        });
      }
      await models.onboarding.bulkCreate(managersBulk);

      console.timeEnd(`select-${offset}`);

      console.timeEnd(`time-${offset}`);

      count = users.length;
      offset += limit;
    }

    console.timeEnd('all');
  } catch (err) {
    console.log('ERROR', err);
  } finally {
    await sequelize.sequelize.close();
  }
})();
