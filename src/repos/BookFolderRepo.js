const { required } = require('../utils/index');
const models = require('../models');
const { Op } = require('sequelize');
const BookRepo = require('./BookRepo');

class BookFolderRepo {
  /**
   * @param teamId {number}
   * @param userId {number}
   * @return {Promise<{
   *  id: number,
   *  name: string,
   *  favorite: boolean,
   *  icon: string,
   *  archivedAt: Date,
   *  books: Object[],
   *  bookOrders: {
   *    order: number,
   *    createdAt: Date
   *  }[]
   * }[]>}
   */
  static async getAllByTeamAndUserIdWithBooks (teamId = required(), userId = required()) {
    const booksWithAccess = await BookRepo.getAllIdsByUserAndTeamIdsForFolders(userId, teamId);
    const include = [
      {
        model: models.bookOrder,
        required: false,
        attributes: ['order', 'createdAt'],
        where: {
          userId: userId
        }
      }
    ];

    if (booksWithAccess) {
      include.push({
        model: models.book,
        required: false,
        where: {
          isSection: false,
          id: booksWithAccess
        },
        include: [
          {
            model: models.teamAccess,
            as: 'memberTeamAccesses',
            required: true,
            where: {
              mode: 'write',
              teamId: teamId,
              projectId: null
            },
            attributes: ['id'],
            include: {
              model: models.user,
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: models.profile
                },
                {
                  model: models.teamMember
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }
              ]
            }
          },
          {
            model: models.teamAccess,
            required: false,
            as: 'clientTeamAccesses',
            where: {
              mode: 'read',
              teamId: teamId
            },
            attributes: ['id'],
            include: {
              model: models.user,
              attributes: ['id', 'email'],
              required: true,
              include: [
                {
                  model: models.profile
                },
                { model: models.avatar }
              ]
            }
          },
          {
            model: models.bookOrder,
            required: false,
            attributes: ['order', 'createdAt'],
            where: {
              userId: userId
            }
          }
        ]
      });
    }

    const folders = await models.bookFolder.findAll({
      where: {
        teamId
      },
      attributes: [
        'id',
        'name',
        'favorite',
        'icon',
        'archivedAt',
        'createdAt'
      ],
      include
    });

    return folders.map(folderModel => {
      const folder = folderModel.get();
      const books = folder.books || [];

      return {
        ...folder,
        books: books.map((bookModel) => {
          const book = bookModel.get();
          const memberTeamAccesses = book.memberTeamAccesses || [];
          const clientTeamAccesses = book.clientTeamAccesses || [];

          delete book.clientTeamAccesses;
          delete book.memberTeamAccesses;

          return {
            ...book,
            shareWith: memberTeamAccesses.map((memberTeamAccess) => ({
              ...memberTeamAccess.user.profile.get(),
              id: memberTeamAccess.user.teamMember?.id,
              userId: memberTeamAccess.user.id,
              avatar: memberTeamAccess.user.avatar
            })),
            clients: clientTeamAccesses.map((clientTeamAccess) => clientTeamAccess)
          };
        })
      };
    });
  }

  static async create ({
    name = required(),
    teamId = required(),
    icon,
    favorite = false
  }) {
    const newBookFolder = await models.bookFolder.create({
      name,
      teamId,
      icon,
      favorite
    });

    return newBookFolder.get();
  }

  static async updateByTeamAndFolderIds (teamId, folderId, {
    name,
    icon,
    favorite,
    archivedAt,
    deletedAt
  }, {
    withoutDeleted = true
  } = {}) {
    const [affectedRows, raw] = await models.bookFolder.update({
      name,
      icon,
      favorite,
      archivedAt,
      deletedAt
    }, {
      where: {
        teamId,
        id: folderId
      },
      paranoid: withoutDeleted,
      returning: ['id', 'name', 'favorite', 'icon', 'archived_at']
    });

    if (!affectedRows) {
      return null;
    }

    return raw[0];
  }

  static async deleteById (id = required(), permanent = false, transaction = null) {
    const updatedRows = await models.bookFolder.destroy(
      {
        where: {
          id
        },
        force: permanent,
        transaction
      }
    );

    return Boolean(updatedRows);
  }

  static async getAllDeletedByTeamId (teamId = required()) {
    const bookFolders = await models.bookFolder.findAll({
      where: {
        teamId,
        deletedAt: {
          [Op.ne]: null
        }
      },
      paranoid: false,
      attributes: ['id', 'name', 'favorite', 'icon', 'archivedAt', 'deletedAt']
    });

    return bookFolders.map(bookFolder => bookFolder.get());
  }

  static async getAllIdsByTeamId (teamId = required(), transaction = null) {
    const bookFolders = await models.bookFolder.findAll({
      where: {
        teamId
      },
      paranoid: false,
      transaction,
      attributes: ['id']
    });

    if (!bookFolders.length) {
      return null;
    }

    return bookFolders.map(bookFolder => bookFolder.id);
  }
}

module.exports = BookFolderRepo;
