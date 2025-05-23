const models = require('../models/index');

/**
 * @param taskId {number}
 * @param userId {number}
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @return {Promise<boolean>}
 */
async function deleteByTaskAndUserId (taskId, userId, options = {
  transaction: null
}) {
  const deletedCount = await models.taskSubscription.destroy({
    where: {
      taskId,
      userId
    },
    force: true,
    transaction: options.transaction
  });

  return Boolean(deletedCount);
}

/**
 * @param createData {{
 *  userId: {number},
 *  taskId: {number}
 * }}
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @return {Promise<void>}
 */
async function create (createData, options = {
  transaction: null
}) {
  await models.taskSubscription.bulkCreate([createData], {
    ignoreDuplicates: true,
    returning: false,
    transaction: options.transaction
  });
}

/**
 * @param taskId {number}
 * @return {Promise<number[]>}
 */
async function getAllUserIdsByTaskId (taskId) {
  const taskSubscriptions = await models.taskSubscription.findAll({
    where: {
      taskId
    },
    attributes: ['userId']
  });

  return taskSubscriptions.map(taskSubscription => taskSubscription.userId);
}

module.exports = {
  deleteByTaskAndUserId,
  create,
  getAllUserIdsByTaskId
};
