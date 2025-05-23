'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');

(async () => {
  try {
    await sequelize.loadModels();

    const count = await models.googleCalendarUser.update({
      addToGoogle: false
    }, {
      where: {
        addToGoogle: true
      }
    });

    console.log(count);
  } catch (error) {
    console.log('Error encountered ', error);
  } finally {
    await sequelize.sequelize.close();
  }
})();
