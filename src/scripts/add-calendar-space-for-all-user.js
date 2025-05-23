'use strict';

require('../utils').dotEnv();
const { sequelize } = require('../loaders');
const models = require('../models');
const BookService = require('../services/BookService');

(async () => {
  await sequelize.loadModels();

  try {
    let count = 100;
    const limit = 100;
    let offset = 0;

    console.time('all');

    while (count === limit) {
      console.time(`time-${offset}`);

      await sequelize.sequelize.transaction(async t => {
        const users = await models.user.findAll({
          paranoid: false,
          limit,
          offset
        });

        for (const user of users) {
          const existingSpace = await models.book.findOne({
            where: {
              userId: user.id,
              isCalendar: true
            }
          });

          if (!existingSpace) {
            await BookService.createCalendarBook(user.id, t);
          }
        }

        console.timeEnd(`time-${offset}`);

        count = users.length;
        offset += limit;
      });
    }

    console.timeEnd('all');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await sequelize.sequelize.close();
  }
})();
