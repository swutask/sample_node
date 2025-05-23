const {
  required,
  generateWhereCondition
} = require('../utils/index');
const models = require('../models');
const { Op } = require('sequelize');

class BookRepo {
  /**
   * @param bookFolderId {number}
   * @return {Promise<{id: number}[]>}
   */
  static async getAllIdsByBookFolderWithDeleted (bookFolderId = required()) {
    const books = await models.book.findAll({
      where: {
        bookFolderId
      },
      paranoid: false,
      attributes: ['id']
    });

    return books.map(book => book.id);
  }

  static async getFirstBookByTeamIdAndUserId (teamId, userId) {
    const accessesWithBooks = await models.teamAccess.findAll({
      where: {
        mode: 'write',
        userId: userId,
        teamId: teamId,
        bookId: {
          [Op.ne]: null
        },
        projectId: null
      },
      attributes: [],
      include: [{
        model: models.book,
        attributes: ['id'],
        required: true,
        where: {
          isSection: false
        }
      }]
    });

    if (!accessesWithBooks.length) {
      return null;
    }

    return accessesWithBooks[0].book;
  }

  static update (
    where = required(),
    data = required(),
    {
      withoutDeleted = true,
      transaction = null
    } = {}
  ) {
    return models.book.update(data, {
      where,
      paranoid: withoutDeleted,
      transaction
    });
  }

  /**
   * @param data {*}
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async updateById (
    data = required(),
    id = required()
  ) {
    const [count, updatedBooks] = await models.book.update(data, {
      where: {
        id
      },
      returning: true
    });

    if (!count) {
      return null;
    }

    const [updatedBook] = updatedBooks;

    return updatedBook.get();
  }

  static async getAllIdsByUserAndTeamIdsForFolders (userId = required(), teamId = required()) {
    const accessesWithBooks = await models.teamAccess.findAll({
      where: {
        mode: 'write',
        userId: userId,
        teamId: teamId,
        bookId: {
          [Op.ne]: null
        },
        projectId: null
      },
      attributes: [],
      include: [{
        model: models.book,
        attributes: ['id'],
        required: true,
        where: {
          isSection: false,
          bookFolderId: {
            [Op.ne]: null
          }
        }
      }]
    });

    if (!accessesWithBooks.length) {
      return null;
    }

    return [...accessesWithBooks.map((accesses) => accesses.book.id)];
  }

  /**
   * @param ids {number[] | undefined}
   * @param userId {number}
   * @param teamId {number}
   * @return {Promise<number[] | null>}
   */
  static async getAllIdsByUserAndTeamIdsOrIds (userId = required(), teamId = required(), ids) {
    const bookWhereCondition = generateWhereCondition({
      id: ids
    });

    const books = await models.book.findAll({
      attributes: ['id'],
      where: bookWhereCondition,
      include: {
        attributes: [],
        model: models.teamAccess,
        as: 'memberTeamAccesses',
        where: {
          userId,
          teamId,
          projectId: null
        }
      }
    });

    if (!books.length) {
      return null;
    }

    return books.map(book => book.id);
  }

  /**
   * @param id {number}
   * @return {Promise<* | null>}
   */
  static async getById (id = required()) {
    const book = await models.book.findByPk(id);

    if (!book) {
      return null;
    }

    return book.get();
  }

  /**
   * @param teamId {number}
   * @return {Promise<number[]>}
   */
  static async getUniqIdsByTeamAccessTeamId (teamId) {
    const books = await models.book.findAll({
      where: {
        isSection: false
      },
      include: {
        model: models.teamAccess,
        as: 'memberTeamAccesses',
        where: {
          teamId
        }
      },
      attributes: ['id'],
      distinct: true
    });

    return books.map((book) => book.id);
  }
}

module.exports = BookRepo;
