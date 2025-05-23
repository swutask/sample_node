const { required } = require('../utils/index');
const { sequelize } = require('../loaders/sequelize');
const { QueryTypes } = require('sequelize');
const models = require('../models/index');

function formatAndThrowError (e = required()) {
  const { messageDetail } = e.original;
  const [field, id] = messageDetail.match(/\w+(?=\))/g);
  const [fieldName] = field.split(/_(?=[a-z]+$)/);
  const camelCaseField = fieldName.replace(
    /_[a-z]/g,
    (group) => group.toUpperCase().replace('_', '')
  );
  const errorMessage = `${camelCaseField} with id=${id} does not exist`;
  throw new Error(errorMessage);
}

class BookOrderRepo {
  /**
   * @param updateData {[any][]}
   * @return {Promise<void>}
   */
  static async bulkCreateOrUpdateBooks (updateData = required()) {
    if (!updateData.length) {
      return;
    }

    try {
      await sequelize.query(`
          INSERT INTO "book_orders" (user_id, book_id, book_folder_id, "order", created_at, updated_at)
          VALUES :updateData
          ON CONFLICT (user_id, book_id)
              DO UPDATE SET "order"=EXCLUDED.order, updated_at=EXCLUDED.updated_at
      `, {
        type: QueryTypes.INSERT,
        replacements: { updateData }
      });
    } catch (e) {
      // Foreign key constraint fails
      if (e.original?.code === '23503') {
        formatAndThrowError(e);
      }

      throw e;
    }
  }

  /**
   * @param updateData {[any][]}
   * @return {Promise<void>}
   */
  static async bulkCreateOrUpdateBookFolders (updateData = required()) {
    if (!updateData.length) {
      return;
    }

    try {
      await sequelize.query(`
          INSERT INTO "book_orders" (user_id, book_id, book_folder_id, "order", created_at, updated_at)
          VALUES :updateData
          ON CONFLICT (user_id, book_folder_id)
              DO UPDATE SET "order"=EXCLUDED.order, updated_at=EXCLUDED.updated_at
      `, {
        type: QueryTypes.INSERT,
        replacements: { updateData }
      });
    } catch (e) {
      // Foreign key constraint fails
      if (e.original?.code === '23503') {
        formatAndThrowError(e);
      }

      throw e;
    }
  }

  static async create ({
    userId = required(),
    bookId = null,
    bookFolderId = null,
    order = 9999
  }) {
    await models.bookOrder.create({
      userId: userId,
      bookId,
      bookFolderId,
      order
    });
  }

  static async deleteByFolderId (folderId = required(), permanent = false, transaction = null) {
    const deletedCount = await models.bookOrder.destroy({
      where: {
        bookFolderId: folderId
      },
      force: permanent,
      transaction
    });

    return Boolean(deletedCount);
  }

  static async restoreByBookFolderId (bookFolderId = required()) {
    await models.bookOrder.update({
      deletedAt: null
    }, {
      where: {
        bookFolderId
      },
      paranoid: false
    });
  }
}

module.exports = BookOrderRepo;
