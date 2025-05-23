const { required } = require('../utils/index');
const BookFolderRepo = require('../repos/BookFolderRepo');
const BookRepo = require('../repos/BookRepo');
const BookOrderRepo = require('../repos/BookOrderRepo');
const { sequelize } = require('../loaders/sequelize');

class BookFolderService {
  static getAll ({
    teamId = required(),
    userId = required()
  }) {
    return BookFolderRepo.getAllByTeamAndUserIdWithBooks(teamId, userId);
  }

  /**
   * @param name {string}
   * @param teamId {number}
   * @param userId {number}
   * @param icon {string | null}
   * @param favorite {boolean}
   * @param order {number}
   * @return {Promise<Object>}
   */
  static async create ({
    name = required(),
    teamId = required(),
    userId = required(),
    icon = null,
    favorite = false,
    order
  }) {
    const newBookFolder = await BookFolderRepo.create({
      name,
      teamId,
      icon,
      favorite
    });
    await BookOrderRepo.create({
      bookFolderId: newBookFolder.id,
      userId,
      order
    });

    return newBookFolder;
  }

  static async update ({
    updateData = required(),
    teamId = required(),
    folderId = required()
  }) {
    const updatedFolder = await BookFolderRepo.updateByTeamAndFolderIds(teamId, folderId, updateData);

    if (!updatedFolder) {
      throw new Error('Book folder was not updated');
    } else {
      await BookRepo.update({
        bookFolderId: updatedFolder.id
      }, {
        favorite: updateData.favorite,
        archivedAt: updateData.archivedAt
      }, {
        withoutDeleted: false
      });
    }

    return updatedFolder;
  }

  static async delete ({
    folderId = required(),
    permanent = false
  }) {
    const ids = await BookRepo.getAllIdsByBookFolderWithDeleted(folderId);

    await sequelize.transaction(async transaction => {
      await BookRepo.update({
        id: ids
      }, {
        bookFolderId: null
      }, {
        withoutDeleted: false,
        transaction
      });
      const successBookFolderDelete = await BookFolderRepo.deleteById(folderId, permanent, transaction);

      if (!successBookFolderDelete) {
        throw new Error('Book folder was not deleted');
      }
    });
  }

  static async restore ({
    teamId = required(),
    folderId = required()
  }) {
    const restoredBookFolders = await BookFolderRepo.updateByTeamAndFolderIds(
      teamId,
      folderId,
      {
        deletedAt: null
      },
      {
        withoutDeleted: false
      }
    );

    if (!restoredBookFolders) {
      throw new Error('Book folder was not restored');
    }

    await BookOrderRepo.restoreByBookFolderId(folderId);

    return restoredBookFolders;
  }

  static getDeleted ({ teamId }) {
    if (!teamId) {
      return [];
    }

    return BookFolderRepo.getAllDeletedByTeamId(teamId);
  }
}

module.exports = BookFolderService;
