const { dotEnv: env } = require('./src/utils');
env();
const { sequelize } = require('./src/loaders/index');

async function main () {
  await sequelize.loadModels();
  // REPO CALL

  process.exit();
}
main();
