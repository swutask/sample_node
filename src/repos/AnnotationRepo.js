const models = require('../models/index');

/**
 * @param createData {
 *   x: number,
 *   y: number,
 *   text: string
 * }
 * @param options {{
 *   transaction: import('sequelize').Transaction | null
 * }}
 * @returns {Promise<*>}
 */
async function create (createData, options = { transaction: null }) {
  const createdAnnotation = await models.annotation.create(createData, {
    transaction: options.transaction,
    returning: true
  });

  return createdAnnotation.get();
}

/**
 * @param id {number}
 * @returns {Promise<any|null>}
 */
async function getByIdWithAttachment (id) {
  const annotation = await models.annotation.findOne({
    where: {
      id
    },
    include: {
      model: models.attachment
    }
  });

  if (!annotation) {
    return null;
  }

  return annotation.get();
}

/**
 * @param id {number}
 * @param userId {number}
 * @returns {Promise<{
 *   id: number,
 *   x: number,
 *   y: number,
 *   resolvedAt: number,
 *   message: {
 *     id: number,
 *     chatId: number
 *   },
 *   attachment: {
 *    id: number,
 *    bookId: number
 *   }
 * }|null>}
 */
async function getByIdAndMessageUserId (id, userId) {
  const annotation = await models.annotation.findOne({
    where: {
      id
    },
    include: [
      {
        model: models.message,
        attributes: ['id', 'chatId'],
        required: true,
        where: {
          userId
        }
      },
      {
        model: models.attachment,
        attributes: ['id', 'bookId']
      }
    ]
  });

  if (!annotation) {
    return null;
  }

  return annotation.get();
}

/**
 * @param id
 * @param updateData {Partial<{
 *   x: number,
 *   y: number,
 *   text: string,
 *   resolvedAt: Date | null
 * }>}
 * @returns {Promise<boolean>}
 */
async function updateById (id, updateData) {
  const [affectedCount] = await models.annotation.update(updateData, {
    where: {
      id
    }
  });

  return Boolean(affectedCount);
}

/**
 * @param id {number}
 * @returns {Promise<boolean>}
 */
async function permanentDeleteById (id) {
  const count = await models.annotation.destroy({
    where: {
      id
    },
    force: true
  });

  return Boolean(count);
}

module.exports = {
  create,
  getByIdWithAttachment,
  getByIdAndMessageUserId,
  permanentDeleteById,
  updateById
};
