'use strict';

require('../utils').dotEnv();
const log = require('../log')('app');
const EmailActivityConsumerService = require('../services/EmailActivityConsumerService.js');
const { sequelize } = require('../loaders');

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
  await EmailActivityConsumerService.run();
}

main();
