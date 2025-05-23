const { Op } = require('sequelize');
const models = require('../models');
const { required } = require('../utils');
const { sequelize } = require('../loaders/sequelize');
const { generateWhereCondition } = require('../utils/index');

class UserRepo {
  static getDefaultOptions () {
    return {
      attributes: ['id', 'email'],
      include: [
        {
          model: models.profile,
          attributes: ['firstName', 'lastName', 'color', 'timezoneName']
        },
        {
          model: models.avatar,
          attributes: ['url']
        }
      ]
    };
  }

  static async getUserByWhereCase ({
    whereCase = required(),
    attributes = [],
    include = []
  }) {
    const {
      attributes: defaultAttributes,
      include: defaultInclude
    } = this.getDefaultOptions();
    const user = await models.user.findOne({
      where: whereCase,
      attributes: [...defaultAttributes, ...attributes],
      include: [...defaultInclude, ...include]
    });

    if (!user) {
      return null;
    }

    return user.get();
  }

  static async getById ({
    id = required()
  }) {
    return this.getUserByWhereCase({
      whereCase: { id }
    });
  }

  static async getByIdAndTeamId ({
    id = required(),
    teamId = required()
  }) {
    return this.getUserByWhereCase({
      whereCase: {
        id
      },
      include: [{
        model: models.teamMember,
        attributes: [],
        where: { teamId }
      }]
    });
  }

  /**
   * @param timezoneNames {string[]}
   * @return {Promise<{
   *   id: number,
   *   inbox: {
   *    receiveWeeklyPersonalEmailNotifications: boolean,
   *    receiveWeeklyGeneralEmailNotifications: boolean
   *   }
   * }[]>}
   */
  static async findAllByTimezoneNamesWithInbox (timezoneNames) {
    return models.user.findAll({
      attributes: ['id'],
      include: [
        {
          model: models.profile,
          attributes: [],
          where: {
            timezoneName: {
              [Op.in]: timezoneNames
            }
          }
        },
        {
          model: models.inbox,
          raw: false,
          attributes: ['receiveWeeklyPersonalEmailNotifications', 'receiveWeeklyGeneralEmailNotifications', 'receiveDailyTasksNotifications'],
          required: true,
          where: {
            [Op.or]: [
              { receiveWeeklyPersonalEmailNotifications: true },
              { receiveWeeklyGeneralEmailNotifications: true },
              { receiveDailyTasksNotifications: true }
            ]
          }
        }
      ]
    });
  }

  /**
   * @param timezoneNames {string[]}
   * @return {Promise<{
   *   id: number,
   *   inbox: {
   *    receiveWeeklyPersonalEmailNotifications: boolean,
   *    receiveWeeklyGeneralEmailNotifications: boolean
   *   }
   * }[]>}
   */
  static async getIdsByTimezoneNamesWithInboxForTaskDeadLine (timezoneNames) {
    const users = await models.user.findAll({
      attributes: ['id'],
      include: [
        {
          model: models.profile,
          attributes: [],
          where: {
            timezoneName: {
              [Op.in]: timezoneNames
            }
          }
        },
        {
          model: models.inbox,
          raw: false,
          attributes: ['receiveTaskDeadlineNotifications'],
          required: true,
          where: { receiveTaskDeadlineNotifications: true }
        }
      ]
    });

    if (!users.length) {
      return null;
    }

    return users.map((user) => user.id);
  }

  /**
   * @param teamId {number}
   * @param bookId {number | null | undefined}
   * @param projectId {number | null}
   * @param options {{
   *   transaction: import('sequelize').Transaction | null
   * }}
   * @return {Promise<number[] | null>}
   */
  static async getAllUniqIdsFromTeamAccess (teamId = required(), bookId, projectId = null, options = {
    transaction: null
  }) {
    const where = generateWhereCondition({
      teamId,
      projectId
    });

    if (bookId) {
      where.bookId = bookId;
    }

    const [result] = await models.teamAccess.findAll({
      attributes: [
        [sequelize.fn('array_agg', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqUserIds']
      ],
      where,
      transaction: options.transaction
    });

    return result.get().uniqUserIds;
  }

  /**
   * @param inboxSetting {{
   *    [p: string]: boolean
   * }}
   * @param taskId {number}
   * @param id {number}
   * @return {Promise<{
   *   email: string,
   *   firstName: string,
   *   lastName: string
   * }[]>}
   */
  static async getAllUserPersonalDataWithInboxSettingsAndTaskSubscription (inboxSetting, taskId, id) {
    const users = await models.user.findAll({
      where: {
        id: {
          [Op.ne]: id
        }
      },
      include: [
        {
          model: models.inbox,
          where: inboxSetting,
          required: true
        },
        {
          model: models.taskSubscription,
          where: {
            taskId
          },
          required: true
        },
        {
          model: models.profile,
          attributes: ['firstName', 'lastName', 'timezoneName']
        }
      ],
      attributes: ['email']
    });

    return users.map((user) => ({
      ...user.profile.get(),
      email: user.email
    }));
  }

  /**
   * @param userId {number}
   * @return {Promise}
  */
  static async getQuickThoughts (userId = required()) {
    const quickThoughts = await models.quickThoughts.findOne({
      where: {
        userId
      }
    });

    if (!quickThoughts) {
      await models.quickThoughts.create({
        userId
      });
    }

    return quickThoughts?.get().text;
  }

  /**
   * @param userId {number}
   * @param text {string}
   * @return {Promise}
  */
  static async updateQuickThoughts (userId = required(), text) {
    const count = await models.quickThoughts.update({
      text
    }, {
      where: {
        userId
      }
    });

    return Boolean(count);
  }
}

module.exports = UserRepo;
