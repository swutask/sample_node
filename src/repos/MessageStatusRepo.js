const models = require('../models/index');

/**
 * @param createData {[]}
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @returns {Promise<*[]>}
 */
async function bulkCreate (createData, options = { transaction: null }) {
  const messageStatuses = await models.messageStatus.bulkCreate(createData, {
    transaction: options.transaction
  });

  return messageStatuses.map((messageStatus) => messageStatus.get());
}

module.exports = {
  bulkCreate
};
