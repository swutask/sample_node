'use strict';

require('../utils').dotEnv();
const { sequelize } = require('../loaders');
const models = require('../models');

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

      const tasks = await models.task.findAll({
        where: { integrationType: 'google' },
        limit,
        offset
      });

      console.timeEnd(`select-${offset}`);

      if (tasks.length > 0) {
        const taskIds = tasks.map(task => task.id);

        console.time(`delete-${offset}`);

        await models.task.destroy({
          where: { id: taskIds }
        });
        console.timeEnd(`delete-${offset}`);
      }

      count = tasks.length;
      offset += limit;

      console.timeEnd(`time-${offset}`);
    }

    console.timeEnd('all');
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    await sequelize.sequelize.close();
  }
})();
