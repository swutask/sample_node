const models = require('../models/index');

/**
 * @param id {number}
 * @return {Promise<any|null>}
 */
async function getByIdWithRelated (id) {
  const activity = await models.activity.findOne({
    where: {
      id
    },
    include: [
      {
        model: models.taskActivity
      },
      {
        model: models.bookActivity
      },
      {
        model: models.inboxActivity
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
  });

  if (!activity) {
    return null;
  }

  return activity.get();
}

/**
 * @param createData {{
 *  type: string,
 *  data: Object,
 *  createdAt: Date
 * }[]}
 * @param transaction {import('sequelize').Transaction || null}
 * @return {Promise<number[]>}
 */
async function bulkCreateReturnIds (createData, { transaction = null } = {}) {
  const newActivities = await models.activity.bulkCreate(createData, {
    returning: ['id'],
    transaction
  });

  return newActivities.map((newActivity) => newActivity.id);
}

/**
 * @param ids {number[]}
 * @return {Promise<*[]>}
 */
async function getAllByIds (ids) {
  const activities = await models.activity.findAll({
    where: {
      id: ids
    },
    include: [
      {
        model: models.user,
        as: 'creator',
        attributes: ['id', 'email'],
        include: [
          {
            model: models.profile,
            attributes: ['firstName', 'lastName', 'color', 'timezone', 'timezoneName']
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
            attributes: ['firstName', 'lastName', 'color', 'timezone', 'timezoneName']
          },
          {
            model: models.avatar,
            attributes: ['url']
          }
        ]
      }
    ]
  });

  return activities.map((activity) => activity.get());
}

module.exports = {
  getByIdWithRelated,
  bulkCreateReturnIds,
  getAllByIds
};
