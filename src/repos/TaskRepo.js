const models = require('../models/index');
const {
  Op,
  QueryTypes
} = require('sequelize');
const {
  required,
  generateWhereCondition
} = require('../utils/index');
const {
  makeRangeCondition,
  makeOrdersCondition
} = require('./helper');
const { sequelize } = require('../loaders/sequelize');
const Sequelize = require('sequelize');

class TaskRepo {
  /**
   * @param { number } taskId
   * @param { number } teamId
   * @returns { Promise<Object | null> }
   */
  static async getOneByTaskIdAndTeamIdWithRelations (taskId, teamId, userId) {
    const task = await models.task.findOne({
      include: [
        {
          model: models.reminder,
          where: {
            userId
          },
          required: false
        },
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project },
        {
          model: models.attachment,
          where: { isTaskThumbnail: true },
          required: false,
          attributes: ['url', 'id', 'showInModal', 'showInCard', 'order'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']]
        },
        {
          model: models.teamMember,
          include: {
            model: models.user,
            attributes: ['id'],
            include: [{
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }]
          }
        },
        {
          model: models.chat,
          include: {
            model: models.message,
            include: {
              model: models.attachment,
              attributes: ['id']
            },
            attributes: ['id']
          }
        },
        {
          model: models.task,
          as: 'subTask',
          include: [
            { model: models.taskTag },
            {
              model: models.teamMember,
              include: {
                model: models.user,
                attributes: ['id'],
                include: [{
                  model: models.profile,
                  attributes: ['firstName', 'lastName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }]
              }
            }
          ]
        },
        {
          model: models.taskSubscription,
          where: {
            userId
          },
          required: false
        }
      ],
      where: {
        teamId,
        id: taskId
      }
    });
    if (!task) {
      return null;
    }
    return task.get();
  }

  /**
   * @param bookId {number}
   * @param teamId {number | undefined}
   * @param userId {number | undefined}
   * @param teamMemberIds {number[] | undefined}
   * @param startDate {Date | undefined}
   * @param endDate {Date | undefined}
   * @param urgencyStatuses {number[] | undefined}
   * @param tagIds {number[] | undefined}
   * @param completedAtFrom {Date}
   * @param completedAtTo {Date}
   * @param withoutCompleted {boolean}
   * @return {Promise<number[]>}
   */
  static async getAllParentIdsByBookIdFilters (bookId = required(), {
    teamId,
    userId,
    teamMemberIds,
    startDate,
    endDate,
    urgencyStatuses,
    tagIds,
    completedAtFrom,
    completedAtTo,
    withoutCompleted
  }) {
    let where = { userId };

    if (teamId) {
      where = { teamId };
    }

    let completedAtCondition = {};

    if (withoutCompleted) {
      completedAtCondition = {
        completedAt: null
      };
    } else if (completedAtFrom || completedAtTo) {
      const completedAtRangeCondition = makeRangeCondition('completedAt', completedAtFrom, completedAtTo);

      completedAtCondition = {
        [Op.or]: [
          completedAtRangeCondition,
          {
            completedAt: null
          }
        ]
      };
    }

    const endDateRangeCondition = makeRangeCondition('endDate', startDate, endDate);
    const taskWhere = generateWhereCondition({ // TODO: Add story points here
      ...where,
      urgentStatus: urgencyStatuses
    });
    const teamMemberWhere = generateWhereCondition({
      id: teamMemberIds
    });
    const tagWhere = generateWhereCondition({
      id: tagIds
    });

    const include = [{
      model: models.reminder,
      where: {
        userId
      },
      required: false
    }];
    let memberWhere = {};

    if (teamMemberIds && teamMemberIds.length) {
      include.push({
        model: models.teamMember,
        where: teamMemberWhere,
        required: false,
        attributes: []
      });
      include.push({
        model: models.task,
        as: 'subTask',
        attributes: [],
        include: {
          model: models.teamMember,
          where: teamMemberWhere,
          attributes: []
        }
      });
      memberWhere = {
        [Op.or]: [
          {
            '$teamMembers.id$': {
              [Op.ne]: null
            }
          },
          {
            '$subTask->teamMembers.id$': {
              [Op.ne]: null
            }
          }
        ]
      };
    }

    if (tagIds && tagIds.length) {
      include.push({
        model: models.taskTag,
        where: tagWhere,
        attributes: []
      });
    }

    const tasks = await models.task.findAll({
      where: {
        bookId: bookId,
        parentId: null,
        ...taskWhere,
        [Op.and]: [
          endDateRangeCondition,
          completedAtCondition
        ],
        ...memberWhere
      },
      include
    });

    return tasks.map(task => task.id);
  }

  /**
   * @param ids {number[]}
   * @param orderData {{
   *  [p:string]: string
   * }}
   * @param userId {number}
   * @return {Promise<*[]>}
   */
  static async getAllByIdsWithRelationsForBookWithOrder (ids = required(), orderData, userId) {
    let order = [
      ['order', 'ASC'],
      ['createdAt', 'DESC'],
      [models.attachment, 'createdAt', 'DESC']
    ];

    const customOrder = makeOrdersCondition(orderData, {
      firstNameOrderTeamMember: [models.teamMember, models.user, models.profile],
      nameOrderTag: [models.taskTag]
    });

    if (customOrder.length) {
      order = [
        ...customOrder,
        ['order', 'ASC'],
        ['createdAt', 'DESC']
      ];
    }

    const tasks = await models.task.findAll({
      where: {
        id: ids
      },
      include: [
        {
          model: models.reminder,
          where: {
            userId
          },
          required: false
        },
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project },
        {
          model: models.attachment,
          where: { isTaskThumbnail: true },
          required: false,
          // TODO move to constant
          attributes: ['url', 'id', 'showInModal', 'showInCard', 'isTaskThumbnail', 'createdAt', 'order']
        },
        {
          model: models.user,
          attributes: ['id'],
          include: [{
            model: models.profile,
            attributes: ['firstName', 'lastName', 'color']
          },
          {
            model: models.avatar,
            attributes: ['url']
          }]
        },
        {
          model: models.teamMember,
          include: {
            model: models.user,
            attributes: ['id'],
            include: [{
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }]
          }
        },
        {
          model: models.chat,
          attributes: {
            include: [[
              Sequelize.literal(`
              (SELECT COUNT(*)
                FROM messages
                WHERE messages.chat_id = "chat"."id"
                AND messages.deleted_at IS NULL)
              `),
              'messageCount'
            ]]
          },
          include: {
            model: models.message,
            include: {
              model: models.attachment,
              attributes: ['id']
            },
            attributes: ['id']
          }
        },
        {
          model: models.task,
          as: 'subTask',
          include: [
            { model: models.taskTag },
            {
              model: models.user,
              attributes: ['id'],
              include: [{
                model: models.profile,
                attributes: ['firstName', 'lastName', 'color']
              },
              {
                model: models.avatar,
                attributes: ['url']
              }]
            },
            {
              model: models.teamMember,
              include: {
                model: models.user,
                attributes: ['id'],
                include: [{
                  model: models.profile,
                  attributes: ['firstName', 'lastName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }]
              }
            },
            {
              model: models.taskSubscription,
              where: {
                userId
              },
              required: false
            }
          ]
        },
        {
          model: models.taskSubscription,
          where: {
            userId
          },
          required: false
        }
      ],
      order
    });

    return tasks.map(task => task.get());
  }

  /**
   * @param teamMemberId {number}
   * @param externalId {string | null}
   * @param date {Date}
   * @return {Promise<*[]|null>}
   */
  static async getByTeamMemberIdAndExternalIdAndDate (teamMemberId = required(), externalId = required(), date = required()) {
    const tasks = await models.task.findAll({
      where: {
        externalId,
        [Op.or]: {
          startDate: {
            [Op.gte]: date
          },
          endDate: {
            [Op.gte]: date
          }
        },
        endDate: {
          [Op.not]: null
        }
      },
      include: {
        model: models.taskToMember,
        where: {
          teamMemberId
        }
      }
    });

    if (!tasks.length) {
      return null;
    }

    return tasks;
  }

  /**
   * @param externalId {string}
   * @return {Promise<*|null>}
   */
  static async getByExternalId (externalId = required()) {
    const task = await models.task.findOne({
      where: {
        externalId
      }
    });

    if (!task) {
      return null;
    }

    return task.get();
  }

  /**
   * @param id {number}
   * @param externalId {string}
   * @return {Promise<*|null>}
   */
  static async getByIdAndExternalId (id = required(), externalId = required()) {
    const task = await models.task.findOne({
      where: {
        id,
        externalId
      }
    });

    if (!task) {
      return null;
    }

    return task.get();
  }

  /**
   * @param id {number}
   * @return {Promise<boolean>}
   */
  static async permanentDeleteById (id = required()) {
    const deletedCount = await models.task.destroy({
      where: {
        id
      },
      force: true
    });

    return Boolean(deletedCount);
  }

  /**
   * @param id {number}
   * @returns {Promise<void>}
   */
  static async restoreById (id) {
    await models.task.restore({
      where: {
        id
      }
    });
  }

  /**
   * @param data {{
   *   id: number,
   *   externalId: string
   * }[]}
   * @return {Promise<boolean>}
   */
  static async bulkUpdateExternalIdsByIds (data = required()) {
    const { ids, externalIds } = data.reduce((accumulator, { id, externalId }) => {
      accumulator.ids.push(id);
      accumulator.externalIds.push(externalId);

      return accumulator;
    }, {
      ids: [],
      externalIds: []
    });

    const [_, updatedCount] = await sequelize.query(`
        UPDATE tasks
        SET external_id = data.external_id
        FROM (SELECT unnest(array[:ids])         as id,
                     unnest(array[:externalIds]) as external_id) as data
        WHERE tasks.id = data.id
    `, {
      type: QueryTypes.UPDATE,
      replacements: { ids, externalIds }
    });

    return ids.length === updatedCount;
  }

  /**
   * @param bookIds {number[]}
   * @param isSample {boolean}
   * @return {Promise<number>}
   */
  static countByBookIdsAndIsSample (bookIds = required(), isSample = required()) {
    if (!bookIds) {
      return 0;
    }

    return models.task.count({
      where: {
        bookId: bookIds,
        isSample
      }
    });
  }

  /**
   * @param endDate {Date}
   * @param teamMemberIds {number[]}
   * @return {Promise<*[] | {teamMemberId: number}[]>}
   */
  static async getAllByEndDateAndMemberIds (endDate = required(), teamMemberIds = required()) {
    const tasks = await sequelize.query(`
        SELECT tasks.*, ttm.team_member_id as "teamMemberId"
        FROM tasks
                 INNER JOIN task_to_members ttm ON tasks.id = ttm.task_id AND ttm.team_member_id IN (:teamMemberIds)
        WHERE EXTRACT(YEAR FROM tasks.end_date) = :year
          AND EXTRACT(MONTH FROM tasks.end_date) = :month
          AND EXTRACT(DAY FROM tasks.end_date) = :day;
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1, // Date month starts from 0
        day: endDate.getDate(),
        teamMemberIds
      },
      model: models.task,
      mapToModel: true
    });

    if (!tasks.length) {
      return [];
    }

    return tasks.map(task => task.get());
  }

  static async getAllByDateRangeAndMemberIds ({
    teamMemberIds,
    dateRangeCondition
  } = {}) {
    const tasks = await models.task.findAll({
      where: {
        isSample: false,
        parentId: null,
        completedAt: null,
        ...dateRangeCondition,
        [Op.or]: [
          {
            '$teamMembers.id$': {
              [Op.ne]: null
            }
          },
          {
            '$subTask->teamMembers.id$': {
              [Op.ne]: null
            }
          }
        ]
      },
      include: [
        {
          model: models.teamMember,
          where: {
            id: teamMemberIds
          },
          required: false,
          attributes: ['id'],
          include: {
            model: models.user,
            attributes: ['id'],
            include: [{
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }]
          }
        },
        {
          model: models.task,
          as: 'subTask',
          attributes: ['id'],
          include: {
            model: models.teamMember,
            where: {
              id: teamMemberIds
            },
            attributes: ['id']
          }
        },
        {
          model: models.book,
          attributes: ['id', 'icon']
        }
      ]
    });

    return tasks.map(task => task.get());
  }

  /**
   * @param id {number}
   * @return {Promise<{
   *   id: number,
   *   bookId: number,
   *   teamId: number
   * }|null>}
   */
  static async getBookAndTeamIdById (id) {
    const task = await models.task.findOne({
      where: {
        id
      },
      attributes: ['id', 'bookId', 'teamId']
    });

    if (!task) {
      return null;
    }

    return task.get();
  }

  /**
   * @param id {number}
   * @return {Promise<{
   *   id: number,
   *   bookId: number,
   *   team: *
   * }|null>}
   */
  static async getBookAndTeamById (id) {
    const task = await models.task.findOne({
      where: {
        id
      },
      include: {
        model: models.team
      },
      attributes: ['id', 'bookId']
    });

    if (!task) {
      return null;
    }

    return task.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getById (id) {
    const task = await models.task.findOne({
      where: {
        id
      }
    });

    if (!task) {
      return null;
    }

    return task.get();
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getByIdWithTeam (id) {
    const task = await models.task.findOne({
      where: {
        id
      },
      include: {
        model: models.team
      }
    });

    if (!task) {
      return null;
    }

    return task.get();
  }
}

module.exports = TaskRepo;
