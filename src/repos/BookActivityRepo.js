const models = require('../models/index');

/**
 * @param bookId {number}
 * @param options {{
 *   limit: number | undefined
 * }}
 * @return {Promise<any[]>}
 */
async function getAllByBookId (bookId, options) {
  const bookActivities = await models.bookActivity.findAll({
    where: {
      bookId
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

  return bookActivities.map((bookActivity) => bookActivity.get());
}

/**
 * @param createData {{
 *   activityId: number,
 *   bookId: number,
 *   teamId: number
 * }[]}
 * @param transaction {import('sequelize').Transaction || null}
 * @return {Promise<number[]>}
 */
async function bulkCreateReturnIds (createData, { transaction }) {
  const newProjectActivities = await models.bookActivity.bulkCreate(createData, {
    returning: ['id'],
    transaction
  });

  return newProjectActivities.map((newProjectActivity) => newProjectActivity.id);
}

module.exports = {
  getAllByBookId,
  bulkCreateReturnIds
};
