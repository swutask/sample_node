'use strict';

require('./utils').dotEnv();

const Umzug = require('umzug');
const path = require('path');
const { sequelize } = require('./loaders');
const log = require('./log')('migratation');

const umzug = new Umzug({
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /\.js$/,
    params: [
      sequelize.sequelize.getQueryInterface()
    ]
  },
  storage: 'sequelize',
  storageOptions: {
    sequelize: sequelize.sequelize
  }
});

async function up () {
  await sequelize.loadModels();
  await umzug.up();
  log.info('All migrations performed successfully');
  await sequelize.sequelize.close();
}

async function down () {
  await sequelize.loadModels();
  await umzug.down();
  log.info('Reverted migration');
  await sequelize.sequelize.close();
}

async function main () {
  const [command = 'up'] = process.argv.splice(2);

  switch (command) {
    case 'up':
      await up();
      break;

    case 'down':
      await down();
      break;

    default:
      log.error('Unknown command');
  }
}

main();
