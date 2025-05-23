const models = require('../models/index');

/**
 * @param ids {number}
 * @return {Promise<*[]>}
 */
async function getAllByIds (ids) {
  const taskRows = await models.taskRow.findAll({
    where: {
      id: ids
    }
  });

  return taskRows.map(taskRow => taskRow.get());
}

module.exports = {
  getAllByIds
};
