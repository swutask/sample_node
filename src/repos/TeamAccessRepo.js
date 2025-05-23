const models = require('../models/index');

class TeamAccessRepo {
  /**
   * @param bookId {number}
   * @return {Promise<* | null>}
   */
  static async getTeamIdAndUserIdByBookId (bookId) {
    const teamAccess = await models.teamAccess.findOne({
      where: {
        bookId
      }
    });

    if (!teamAccess) {
      const book = await models.book.findByPk(bookId);

      return {
        userId: book.userId,
        teamId: null
      };
    }

    return {
      userId: teamAccess.userId,
      teamId: teamAccess.teamId
    };
  }
}

module.exports = TeamAccessRepo;
