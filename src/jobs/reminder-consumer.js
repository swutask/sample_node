'use strict';

require('../utils/index.js').dotEnv();
const log = require('../log/index.js')('app');
const ReminderConsumerService = require('../services/ReminderConsumerService.js');
const { sequelize } = require('../loaders/index.js');

async function main () {
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', reason);
    process.exit(1);
  });

  await sequelize.loadModels();
  await ReminderConsumerService.run();
}

main();
