'use strict';

require('../utils').dotEnv();
const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();
  try {
    let count = 100;
    const limit = 100;
    let offset = 0;

    console.time('all');
    while (count === limit) {
      console.time(`time-${offset}`);
      console.time(`select-${offset}`);

      const tasks = await models.task.findAll({
        limit,
        offset,
        paranoid: false
      });

      for (const task of tasks) {
        await task.update({
          collaborationKey: `complex-book-${task.bookId}-task-${task.id}`
        });
      }

      console.timeEnd(`select-${offset}`);

      console.timeEnd(`time-${offset}`);

      count = tasks.length;
      offset += limit;
    }

    console.timeEnd('all');
  } catch (err) {
    console.log('ERROR', err);
  } finally {
    await sequelize.sequelize.close();
  }
})();
