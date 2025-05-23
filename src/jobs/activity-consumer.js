'use strict';

require('../utils/index').dotEnv();
const log = require('../log/index')('app');
const ActivityConsumerService = require('../services/ActivityConsumerService');
const { sequelize } = require('../loaders/index');

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
  await ActivityConsumerService.run();
}

main();
