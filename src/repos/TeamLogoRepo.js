const { required } = require('../utils/index');
const models = require('../models/index');

class TeamLogoRepo {
  /**
   * @param teamId {number}
   * @return {Promise<{
   *   id: number,
   *   size: number,
   *   mimeType: string,
   *   key: string,
   *   urd: string,
   *   createdAt: Date,
   *   updatedAt: Date,
   *   teamId: number,
   *   userId: number,
   * } | null>}
   */
  static async getByTeamId (teamId = required()) {
    const logo = await models.teamLogo.findOne({
      where: {
        teamId: teamId
      }
    });

    if (!logo) {
      return logo;
    }

    return logo.get();
  }

  /**
   * @param teamId {number}
   * @return {Promise<boolean>}
   */
  static async deleteByTeamId (teamId = required()) {
    const deletedRows = await models.teamLogo.destroy({
      where: {
        teamId: teamId
      }
    });

    return Boolean(deletedRows);
  }
}

module.exports = TeamLogoRepo;
