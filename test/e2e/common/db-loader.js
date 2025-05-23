const { config } = require('dotenv');
const { join } = require('path');
config({
  path: join(
    __dirname,
    '..', '..', '..',
    '.env.e2e'
  )
});
const { sequelize } = require('../../../src/loaders');

/**
 * @type {{
 * loadModels: ((function(): Promise<void>)),
 * SequelizeInstance: import('sequelize')
 * }}
 */
module.exports = {
  SequelizeInstance: sequelize.sequelize,
  loadModels: sequelize.loadModels
};
