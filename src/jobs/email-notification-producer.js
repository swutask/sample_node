require('../utils').dotEnv();
const log = require('../log')('app');
const EmailNotificationProducerService = require('../services/EmailNotificationProducerService');
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

  if (process.env.NODE_ENV === 'production') {
    await EmailNotificationProducerService.run();
  }

  await sequelize.sequelize.close();
  process.exit();
}

main();
