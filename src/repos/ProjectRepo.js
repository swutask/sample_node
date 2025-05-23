const { required } = require('../utils/index');
const models = require('../models');

class ProjectRepo {
  /**
   * @param bookId {number}
   * @param userId {number | null}
   * @return {Promise<any[]>}
   */
  static async getAllByBookAndUserId (bookId = required(), userId = null) {
    const projects = await models.project.findAll({
      where: {
        bookId,
        userId
      },
      attributes: { exclude: ['body', 'state'] },
      include: [
        {
          model: models.project,
          as: 'subProject',
          attributes: { exclude: ['body', 'state'] },
          include: [
            {
              model: models.project,
              as: 'subProject',
              attributes: { exclude: ['body', 'state'] }
            }
          ]
        }
      ],
      order: [
        ['createdAt', 'ASC'],
        ['order', 'ASC']
      ]
    });

    return projects.map(project => project.get());
  }

  /**
   * @param id {number}
   * @param teamId {number}
   * @param userId {number}
   * @return {Promise<any>}
   */
  static async getByTeamAccessThrowBook (id = required(), teamId = required(), userId = required()) {
    const project = await models.project.findOne({
      where: {
        id
      },
      attributes: {
        exclude: ['state']
      },
      include: {
        model: models.book,
        include: {
          model: models.teamAccess,
          as: 'memberTeamAccesses',
          where: {
            teamId,
            userId
          }
        },
        required: true
      }
    });

    if (!project) {
      return null;
    }

    return project.get();
  }

  /**
   * @param id {number}
   * @param userId {number}
   * @return {Promise<any>}
   */
  static async getByIdAndUserId (id = required(), userId = required()) {
    const project = await models.project.findOne({
      where: {
        id: id,
        userId: userId
      },
      attributes: {
        exclude: ['state']
      }
    });

    if (!project) {
      return null;
    }

    return project.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getById (id) {
    const project = await models.project.findOne({
      where: {
        id: id
      },
      attributes: {
        exclude: ['state']
      }
    });

    if (!project) {
      return null;
    }

    return project.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getByIdiWthBook (id) {
    const project = await models.project.findOne({
      where: {
        id: id
      },
      attributes: {
        exclude: ['state']
      },
      include: {
        model: models.book,
        attributes: ['teamId']
      }
    });

    if (!project) {
      return null;
    }

    return project.get();
  }

  /**
   * @param projectId {number}
   * @param shareId {string}
   * @return {Promise<*|null>}
   */
  static async getUserIdFromSharedProject (projectId, shareId) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId,
        mode: 'write',
        isActive: true
      },
      include: [
        {
          model: models.project,
          required: true,
          attributes: ['id']
        },
        {
          model: models.user,
          attributes: ['id'],
          include: {
            model: models.teamMember,
            attributes: ['teamId']
          }
        }
      ]
    });

    if (!shareLink) throw new Error('Share link not found');

    const userId = shareLink.userId;
    const teamId = shareLink.user?.teamMember.teamId;

    return {
      userId,
      teamId
    };
  }
}

module.exports = ProjectRepo;
