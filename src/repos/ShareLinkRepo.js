const { required } = require('../utils/index');
const models = require('../models');

class ShareLinkRepo {
  /**
   * @param id {number}
   * @return {Promise<{
   *   id: string,
   *   isActive: boolean,
   *   mode: string,
   *   createdAt: Date,
   *   updatedAt: Date,
   *   deletedAt: Date | null,
   *   userId: number,
   *   projectId: number,
   *   project: {
   *     id: number,
   *     title: string,
   *     body: string | null,
   *     document: null,
   *     order: number | null,
   *     isLocked: boolean,
   *     state: string | null,
   *     icon: string | null,
   *     createdAt: Date,
   *     updatedAt: Date,
   *     deletedAt: Date| null,
   *     bookId: number,
   *     userId: number,
   *     parentId: number | null
   *   },
   *   user: {
   *     id: number,
   *     teamMember: {
   *       id: number,
   *       team?: {
   *         id: number,
   *         name: string,
   *         teamLogo: {
   *           url: string
   *         }
   *       }
   *     }
   *   }
   * } | null>}
   */
  static async getByIdWithIncludes (id = required()) {
    return models.shareLink.findByPk(id, {
      include: [
        {
          model: models.project
        },
        {
          model: models.user,
          attributes: ['id'],
          include: {
            model: models.teamMember,
            attributes: ['id'],
            include: {
              model: models.team,
              attributes: ['id', 'name'],
              include: {
                model: models.teamLogo,
                attributes: ['url']
              }
            }
          }
        }
      ]
    });
  }
}

module.exports = ShareLinkRepo;
