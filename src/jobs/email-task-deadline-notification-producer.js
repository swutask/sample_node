require('../utils').dotEnv();
const log = require('../log')('app');
const { sequelize } = require('../loaders');
const EmailTaskDeadlineNotificationProducerService = require('../services/EmailTaskDeadlineNotificationProducerService');

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
  await EmailTaskDeadlineNotificationProducerService.run();
  await sequelize.sequelize.close();
  process.exit();
}

main();
