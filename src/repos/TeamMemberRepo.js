const { required } = require('../utils/index');
const models = require('../models');
const { Op } = require('sequelize');

class TeamMemberRepo {
  /**
   * @param teamId {number}
   * @return {Promise<number[] | null>}
   */
  static async getAllIdsByTeamId (teamId = required(), userId = required()) {
    const members = await models.teamMember.findAll({
      attributes: ['id'],
      where: {
        teamId,
        userId: {
          [Op.not]: userId
        }
      }
    });

    if (!members.length) {
      return null;
    }

    return members.map(({ id }) => id);
  }

  /**
   * @param ids {number}
   * @param transaction
   * @return {Promise<number[]>}
   */
  static async getUserIdsByIds (ids = required(), transaction = null) {
    const teamMembers = await models.teamMember.findAll({
      where: {
        id: ids
      },
      attributes: ['userId'],
      transaction
    });

    return teamMembers.map((teamMember) => teamMember.userId);
  }

  /**
   * @param userId {number}
   * @return {Promise<*|null>}
   */
  static async getByUserId (userId = required()) {
    const teamMember = await models.teamMember.findOne({
      where: {
        userId
      },
      include: [
        {
          model: models.team,
          attributes: ['name', 'id', 'link']
        }
      ]
    });

    if (!teamMember) {
      return null;
    }

    return teamMember.get();
  }

  /**
   * @param userIds {number[]}
   * @return {Promise<*[] | null>}
   */
  static async getAllByUserIds (userIds = required()) {
    const teamMembers = await models.teamMember.findAll({
      attributes: ['id', 'userId'],
      where: {
        userId: userIds
      }
    });

    if (!teamMembers.length) {
      return null;
    }

    return teamMembers;
  }

  /**
   * @param bookId {number}
   * @returns {Promise<any[]>}
   */
  static async getAllByBookIdWithUserInfo (bookId) {
    const teamMembers = await models.teamMember.findAll({
      include: {
        model: models.user,
        attributes: ['id', 'email'],
        include: [
          {
            model: models.profile,
            attributes: ['firstName', 'lastName', 'color', 'timezone', 'timezoneName']
          },
          {
            model: models.avatar,
            attributes: ['url']
          },
          {
            model: models.teamAccess,
            attributes: [],
            where: {
              bookId
            }
          }
        ]
      }
    });

    return teamMembers.map((teamMember) => teamMember.get());
  }

  /**
   * @param teamId {number}
   * @returns {Promise<number[]|null>}
   */
  static async getAllUserIdsByTeamId (teamId) {
    const teamMembers = await models.teamMember.findAll({
      attributes: ['userId'],
      where: {
        teamId
      }
    });

    if (!teamMembers.length) {
      return null;
    }

    return teamMembers.map((teamMember) => teamMember.userId);
  }
}

module.exports = TeamMemberRepo;
