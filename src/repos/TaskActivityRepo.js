const models = require('../models/index');

/**
 * @param createData {{
 *  messageId: number,
 *  taskId: number,
 *  activityId: number,
 *  teamId: number
 * }[]}
 * @param transaction {import('sequelize').Transaction || null}
 * @return {Promise<number[]>}
 */
async function bulkCreateReturnIds (createData, { transaction = null }) {
  const newTaskActivities = await models.taskActivity.bulkCreate(createData, {
    returning: ['id'],
    transaction
  });

  return newTaskActivities.map((newTaskActivity) => newTaskActivity.id);
}

/**
 * @param taskId {number}
 * @param options {{
 *   limit: number | undefined
 * }}
 * @return {Promise<any[]>}
 */
async function getAllByTaskId (taskId, options) {
  const taskActivities = await models.taskActivity.findAll({
    where: {
      taskId
    },
    include: {
      model: models.activity,
      include: [
        {
          model: models.user,
          as: 'creator',
          attributes: ['id', 'email'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        },
        {
          model: models.user,
          as: 'relatedUser',
          attributes: ['id', 'email'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        }
      ]
    },
    limit: options.limit,
    order: [[models.activity, 'createdAt', 'DESC']]
  });

  return taskActivities.map((taskActivity) => taskActivity.get());
}

module.exports = {
  bulkCreateReturnIds,
  getAllByTaskId
};
