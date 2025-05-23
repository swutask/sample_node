const models = require('../models/index');
const { Op } = require('sequelize');

/**
 * @param inboxId {number}
 * @param type {'private' | 'public'}
 * @param options {{
 *   limit: number | undefined
 * }}
 * @return {Promise<*[]>}
 */
async function getAllByInboxIdAndType (inboxId, type, options = {}) {
  const inboxActivities = await models.inboxActivity.findAll({
    where: {
      inboxId,
      type
    },
    include: [
      {
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
      {
        model: models.task
      }
    ],
    limit: options.limit,
    order: [[models.activity, 'createdAt', 'DESC']]
  });

  const activities = inboxActivities.reduce((acc, curr) => {
    const item = curr.get();

    if (!(item.taskId && !item.task)) {
      item.bookId = item.activity?.dataValues?.data?.bookId || null;
      acc.push(item); // skip activities with deleted task
    }

    return acc;
  }, []);

  return activities;
}

async function getAllActivitiesByInboxIdTypeCreatedAt (inboxId, type, createdAt) {
  const inboxActivities = await models.inboxActivity.findAll({
    where: {
      inboxId,
      type,
      createdAt: {
        [Op.gt]: createdAt
      }
    },
    include: {
      model: models.activity,
      include: [
        {
          model: models.taskActivity,
          required: true,
          include: {
            model: models.task,
            include: {
              model: models.team
            },
            attributes: ['id', 'bookId']
          }
        },
        {
          model: models.user,
          as: 'creator',
          attributes: ['id', 'email'],
          include: {
            model: models.profile
          }
        },
        {
          model: models.user,
          as: 'relatedUser',
          attributes: ['id', 'email'],
          include: {
            model: models.profile
          }
        }
      ]
    }
  });

  return inboxActivities.map((inboxActivity) => inboxActivity.activity.get());
}

/**
 * @param ids {number[]}
 * @param inboxId {number}
 * @param data {{
 *   status: 'read' | 'unread'
 * }}
 * @return {Promise<number>}
 */
async function updateByIdsAndInboxId (ids, inboxId, data) {
  const [affectedCount] = await models.inboxActivity.update(data, {
    where: {
      id: ids,
      inboxId
    }
  });

  return affectedCount;
}

/**
 * @param createData {{
 *   activityId: number,
 *   inboxId: number,
 *   teamId: number
 * }[]}
 * @param transaction {import('sequelize').Transaction || null}
 * @return {Promise<number[]>}
 */
async function bulkCreateReturnIds (createData, { transaction = null } = {}) {
  const newProjectActivities = await models.inboxActivity.bulkCreate(createData, {
    returning: ['id'],
    transaction
  });

  return newProjectActivities.map((newProjectActivity) => newProjectActivity.id);
}

/**
 * @param id {number}
 * @param inboxId {number}
 * @return {Promise<boolean>}
 */
async function deleteByIdAndInboxId (id, inboxId) {
  const count = await models.inboxActivity.destroy({
    where: {
      id,
      inboxId
    },
    force: true
  });

  return Boolean(count);
}

/**
 * @param type {string}
 * @param inboxId {number}
 * @return {Promise<boolean>}
 */
async function deleteByTypeInboxId (type, inboxId) {
  const count = await models.inboxActivity.destroy({
    where: {
      inboxId,
      type
    },
    force: true
  });

  return Boolean(count);
}

module.exports = {
  bulkCreateReturnIds,
  deleteByIdAndInboxId,
  deleteByTypeInboxId,
  getAllByInboxIdAndType,
  updateByIdsAndInboxId,
  getAllActivitiesByInboxIdTypeCreatedAt
};
