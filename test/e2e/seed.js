const { config } = require('dotenv');
const { join } = require('path');
config({
  path: join(
    __dirname,
    '..', '..',
    '.env.e2e'
  )
});
const { sequelize, loadModels } = require('../../src/loaders/sequelize');
const Umzug = require('umzug');

const umzug = new Umzug({
  migrations: {
    path: join(__dirname, '..', '..', 'src/migrations'),
    pattern: /\.js$/,
    params: [
      sequelize.getQueryInterface()
    ]
  },
  storage: 'sequelize',
  storageOptions: {
    sequelize: sequelize
  }
});

async function main () {
  await loadModels();
  await sequelize.drop({
    cascade: true
  });
  await sequelize.query(`
      DELETE
      FROM pg_type
      WHERE typname LIKE 'enum_%'
  `);
  await umzug.up();
  await sequelize.close();

  process.exit(0);
}
main();
