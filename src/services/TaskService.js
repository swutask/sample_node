'use strict';
const { google } = require('googleapis');

const models = require('../models');
const { required } = require('../utils');
const { elasticsearch } = require('../libs');
const { sequelize: { sequelize: seq } } = require('../loaders');

const PlanService = require('./PlanService');
const CheckService = require('./CheckService');
const SocketNotifyService = require('./SocketNotifyService');
const ActivityProducerService = require('./ActivityProducerService');

const TaskRepo = require('../repos/TaskRepo');
const TaskSubscriptionRepo = require('../repos/TaskSubscriptionRepo');
const TagToTaskRepo = require('../repos/TagToTaskRepo');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const TaskToMemberRepo = require('../repos/TaskToMemberRepo');
const { validateRecurringRule } = require('../libs/rrule');
const moment = require('moment');
const NotificationService = require('./NotificationService');
const NotificationCodes = require('../core/NotificationCodes');
const { CustomError } = require('../errors/CustomError');

class TaskService {
  static async getById ({
    taskId = required(),
    teamId = required(),
    userId = required()
  }) {
    const task = await TaskRepo.getOneByTaskIdAndTeamIdWithRelations(taskId, teamId, userId);
    if (!task) {
      throw new CustomError('Wrong task id', 400);
    }
    return task;
  }

  static async create ({
    title = required(),
    userId = required(),
    bookId = required(),
    additionalInfo,
    teamId = null,
    projectId,
    subTitle,
    isUrgent,
    urgentStatus,
    storyPoints,
    order,
    taskRowId,
    parentId,
    isToday = false,
    tagIds,
    endDate,
    startDate,
    completedAt,
    isSample,
    teamMembers = [],
    externalId,
    rrule,
    movedFromTaskId = null,
    collaborationKey = null,
    integrationType,
    htmlLink,
    startEventTime,
    endEventTime,
    eventType,
    calendarId
  } = {}) {
    await PlanService.checkTasks(userId, teamId);
    let rruleSetValues = [];

    if (rrule) {
      rruleSetValues = validateRecurringRule(rrule);
    }

    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: false
    });

    const createdTaskId = await seq.transaction(async t => {
      const createdTask = await models.task.create({
        userId,
        teamId,
        additionalInfo,
        projectId,
        subTitle,
        isUrgent,
        urgentStatus,
        storyPoints,
        taskRowId,
        parentId,
        isToday,
        isSample,
        completedAt,
        order,
        tagIds,
        bookId,
        title,
        endDate,
        startDate,
        externalId,
        rrule,
        movedFromTaskId,
        collaborationKey,
        integrationType,
        htmlLink,
        startEventTime,
        endEventTime,
        eventType,
        calendarId
      }, {
        transaction: t
      });

      if (!collaborationKey) {
        createdTask.update({
          collaborationKey: `complex-book-${bookId}-task-${createdTask.id}`
        }, {
          transaction: t
        });
      }

      const chat = await models.chat.create({
        taskId: createdTask.id
      }, {
        transaction: t
      });

      if (teamId) {
        const members = await models.teamMember.findAll({
          where: {
            teamId: teamId
          },
          transaction: t
        });

        for (const m of members) {
          await models.chatSetting.create({
            chatId: chat.id,
            userId: m.userId,
            mutedAt: null
          }, {
            transaction: t
          });
        }
      } else {
        await models.chatSetting.create({
          chatId: chat.id,
          userId: userId,
          mutedAt: null
        }, {
          transaction: t
        });
      }

      if (tagIds?.length > 0) {
        for (const id of tagIds) {
          await models.tagToTask.create({
            tagId: id,
            taskId: createdTask.id
          }, {
            transaction: t
          });
        }
      }

      return createdTask.id;
    });

    if (teamMembers.length) {
      // TODO bulk create
      for (const member of teamMembers) {
        await this._assignMember({
          memberId: member,
          id: createdTaskId,
          bookId,
          teamId,
          userId
        });
      }
    }

    await TaskSubscriptionRepo.create({
      taskId: createdTaskId,
      userId
    });

    const taskModel = await models.task.findByPk(createdTaskId, {
      include: [
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project },
        {
          model: models.attachment,
          where: { isTaskThumbnail: true },
          required: false,
          // TODO move to constant
          attributes: ['url', 'id', 'showInModal', 'showInCard', 'order'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']]
        },
        {
          model: models.user,
          attributes: ['id'],
          include: [{
            model: models.profile,
            attributes: ['firstName', 'lastName', 'color']
          }, {
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
            }, {
              model: models.avatar,
              attributes: ['url']
            }]
          }
        },
        { model: models.chat },
        {
          model: models.task,
          as: 'subTask'
        },
        {
          model: models.taskSubscription,
          where: {
            userId
          },
          required: false
        }
      ]
    });
    const task = taskModel.get();

    if (!externalId && endDate) {
      const googleCalendarUser = await models.googleCalendarUser.findOne({
        where: {
          userId
        }
      });

      if (googleCalendarUser?.active && googleCalendarUser.addToGoogle) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CALENDAR_AUTH_KEY,
            process.env.GOOGLE_CALENDAR_AUTH_SECRET
          );
          const tokens = {
            refresh_token: googleCalendarUser.refreshToken
          };
          oauth2Client.setCredentials(tokens);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: {
              summary: title,
              description: subTitle,
              start: {
                date: moment(startDate || endDate).format('Y-MM-DD'),
                timeZone: 'UTC'
              },
              end: {
                date: moment(endDate).format('Y-MM-DD'),
                timeZone: 'UTC'
              },
              recurrence: rruleSetValues
            }
          });

          await models.task.update({
            externalId: response.data?.id
          }, {
            where: {
              id: task.id
            }
          });
        } catch (e) {
          console.log(e);
        }
      }
    }

    await elasticsearch.updateById({
      id: task.id,
      obj: task,
      modelName: 'task',
      upsert: true
    });

    if (teamId) {
      if (parentId) {
        await ActivityProducerService.sendMessage({
          from: null,
          to: {
            id: task.id,
            parentId: task.parentId
          },
          creatorId: userId,
          entity: 'subTask',
          type: 'task'
        });
      } else {
        await ActivityProducerService.sendMessage({
          from: null,
          to: {
            id: task.id
          },
          creatorId: userId,
          entity: 'task',
          type: 'task'
        });
      }
    }

    return task;
  }

  static async createByExternalResource ({
    title = required(),
    additionalInfo,
    userId = required(),
    teamId = required(),
    bookId,
    externalId = required(),
    startDate = required(),
    endDate = required(),
    htmlLink,
    integrationType,
    startEventTime,
    endEventTime,
    eventType,
    calendarId,
    rrule
  }) {
    // const teamMember = await TeamMemberRepo.getByUserId(userId);

    await this.create({
      externalId,
      title,
      additionalInfo,
      userId,
      teamId,
      bookId,
      startDate,
      endDate,
      rrule,
      htmlLink,
      integrationType,
      startEventTime,
      endEventTime,
      eventType,
      calendarId
    });
  }

  static async getCalendarTasks ({
    userId = required()
  } = {}) {
    const calendarTask = await models.task.findAll({
      where: {
        userId,
        integration_type: 'google'
      }
    });

    const taskIds = calendarTask.map(i => i.id);

    return TaskRepo.getAllByIdsWithRelationsForBookWithOrder(taskIds, {}, userId);
  }

  static async getByBookId ({
    userId = required(),
    teamId = null,
    bookIds = [],
    ids = [],
    tagIds = [],
    teamMemberIds = [],
    startDate,
    endDate,
    urgencyStatuses = [],
    search,
    completedAtFrom,
    completedAtTo,
    withoutCompleted,
    orders
  } = {}) {
    let taskIds = ids;

    if (!taskIds.length && bookIds.length) {
      taskIds = await TaskRepo.getAllParentIdsByBookIdFilters(bookIds, {
        teamId,
        tagIds,
        userId,
        teamMemberIds,
        startDate,
        endDate,
        urgencyStatuses,
        completedAtFrom,
        completedAtTo,
        withoutCompleted
      });

      if (!taskIds.length) return [];
    }

    if (search) {
      const query = `${search.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&').trim()}`;
      const { hints } = await elasticsearch.search('task', {
        query: {
          bool: {
            must: [
              {
                terms: { _id: taskIds }
              },
              {
                query_string: {
                  query,
                  default_operator: 'AND',
                  fields: ['title', 'subTitle']
                }
              }
            ]
          }
        }
      });
      taskIds = hints.map(({ _id }) => parseInt(_id));
    }

    return TaskRepo.getAllByIdsWithRelationsForBookWithOrder(taskIds, orders, userId);
  }

  static async deleteByExternalResource ({
    userId = required(),
    id = required(),
    teamId = required(),
    bookId = required(),
    parentId = required()
  }) {
    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: false
    });
    const taskForDelete = await TaskRepo.getById(id);

    if (!taskForDelete) {
      return;
    }

    await TaskRepo.permanentDeleteById(id);

    if (parentId) {
      await ActivityProducerService.sendMessage({
        from: {
          id,
          parentId: taskForDelete.parentId,
          title: taskForDelete.title
        },
        to: null,
        creatorId: userId,
        entity: 'subTask',
        type: 'task'
      });
    }
  }

  // TODO delete from elastic
  static async delete ({
    userId = required(),
    bookId = required(),
    id = required(),
    teamId = null
  } = {}) {
    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: false
    });

    let userOrTeamId = { userId };

    if (teamId) {
      userOrTeamId = { teamId };
    }

    const task = await models.task.findOne({
      where: {
        id,
        bookId,
        ...userOrTeamId
      }
    });

    if (!task) {
      throw new Error('task not found');
    }

    await task.destroy();

    if (task.externalId) {
      const googleCalendarUser = await models.googleCalendarUser.findOne({
        where: {
          userId
        }
      });

      if (googleCalendarUser?.active) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CALENDAR_AUTH_KEY,
          process.env.GOOGLE_CALENDAR_AUTH_SECRET
        );
        const tokens = {
          refresh_token: googleCalendarUser.refreshToken
        };
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: task.externalId
        });
      }
    }

    if (teamId && task.parentId) {
      await ActivityProducerService.sendMessage({
        from: {
          id: task.id,
          parentId: task.parentId,
          title: task.title
        },
        to: null,
        creatorId: userId,
        entity: 'subTask',
        type: 'task'
      });
    }
  }

  /**
   * @param parentId {number}
   * @param teamId {number}
   * @param bookId {number}
   * @param userId {number}
   * @param id {number}
   * @return {Promise<void>}
   * @private
   */
  static async _notifyDeleting ({
    parentId = required(),
    teamId,
    bookId,
    userId,
    id
  }) {
    const members = await models.teamAccess.findAll({
      where: {
        teamId,
        bookId,
        projectId: null
      }
    });

    for (const member of members) {
      if (member.userId === userId) {
        continue;
      }

      SocketNotifyService.notify({
        userId: member.userId,
        name: 'task',
        payload: {
          bookId: bookId,
          type: 'delete',
          value: {
            id,
            parentId
          }
        }
      });
    }
  }

  static async updateByExternalResource ({
    userId = required(),
    id = required(),
    teamId = required(),
    bookId = required(),
    startDate,
    endDate,
    title,
    subTitle,
    rrule
  }) {
    await this.update({
      id,
      bookId,
      teamId,
      userId,
      startDate,
      endDate,
      title,
      subTitle,
      rrule,
      external: true
    });
  }

  static async update ({
    id = required(),
    bookId = required(),
    teamId = null,
    userId = required(),
    additionalInfo,
    projectId,
    subTitle,
    isUrgent,
    urgentStatus,
    storyPoints,
    taskRowId,
    title,
    endDate,
    startDate,
    rrule,
    external = false
  } = {}) {
    const taskBeforeUpdate = await TaskRepo.getById(id);

    if (!taskBeforeUpdate) {
      throw new Error('Task not found');
    }

    const data = {
      additionalInfo,
      projectId,
      subTitle,
      isUrgent,
      urgentStatus,
      storyPoints,
      endDate,
      startDate,
      taskRowId,
      title,
      rrule
    };
    let userOrTeamId = { userId };

    if (teamId) {
      userOrTeamId = { teamId };
    }

    const updatedTasks = await seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      const [count, tasks] = await models.task.update(data, {
        where: {
          id,
          bookId,
          ...userOrTeamId
        },
        transaction: t,
        returning: '*'
      });

      if (!count) {
        throw new Error('task not found');
      }

      return tasks;
    });

    await elasticsearch.updateById({
      id: id,
      obj: {
        title,
        subTitle,
        additionalInfo
      },
      modelName: 'task'
    });

    if (teamId) {
      const [updatedTask] = updatedTasks;
      const activityEntity = taskBeforeUpdate.parentId ? 'subTask' : 'task';
      await ActivityProducerService.sendMessage({
        from: taskBeforeUpdate,
        to: updatedTask,
        creatorId: userId,
        type: 'task',
        entity: activityEntity
      });

      const googleCalendarUser = await models.googleCalendarUser.findOne({
        where: {
          userId
        }
      });
      let rruleSetValues = [];

      if (rrule || updatedTask.rrule) {
        rruleSetValues = validateRecurringRule(rrule || updatedTask.rrule);
      }

      if (!external && googleCalendarUser?.active) {
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CALENDAR_AUTH_KEY,
            process.env.GOOGLE_CALENDAR_AUTH_SECRET
          );
          const tokens = {
            refresh_token: googleCalendarUser.refreshToken
          };
          oauth2Client.setCredentials(tokens);
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          if (updatedTask.externalId && updatedTask.endDate) {
            await calendar.events.update({
              eventId: updatedTask.externalId,
              calendarId: 'primary',
              resource: {
                summary: updatedTask.title,
                description: updatedTask.subTitle,
                start: {
                  date: moment(updatedTask.startDate || updatedTask.endDate).format('Y-MM-DD'),
                  timeZone: 'UTC'
                },
                end: {
                  date: moment(updatedTask.endDate).format('Y-MM-DD'),
                  timeZone: 'UTC'
                },
                recurrence: rruleSetValues
              }
            });
          } else if (!updatedTask.externalId && updatedTask.endDate) {
            const response = await calendar.events.insert({
              calendarId: 'primary',
              resource: {
                summary: updatedTask.title,
                description: updatedTask.subTitle,
                start: {
                  date: new Date(updatedTask.startDate || updatedTask.endDate),
                  timeZone: 'UTC'
                },
                end: {
                  date: new Date(updatedTask.endDate),
                  timeZone: 'UTC'
                },
                recurrence: rruleSetValues
              }
            });

            await models.task.update({
              externalId: response.data?.id
            }, {
              where: {
                id: updatedTask.id
              }
            });
          } else if (updatedTask.externalId && updatedTask.endDate === null) {
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: updatedTask.externalId
            });

            await models.task.update({
              externalId: null
            }, {
              where: {
                id: updatedTask.id
              }
            });
          }
        } catch (e) {
          console.log(e);
        }
      }

      const task = await models.task.findByPk(id, {
        include: [
          { model: models.taskTag },
          { model: models.taskRow },
          { model: models.project },
          {
            model: models.attachment,
            where: { isTaskThumbnail: true },
            required: false,
            // TODO move to constant
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
          }
        ]
      });

      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        SocketNotifyService.notify({
          userId: member.userId,
          name: 'task',
          payload: {
            bookId: bookId,
            type: 'update',
            id: id,
            value: task.get()
          }
        });
      }
    }
  }

  static async updatePreview ({
    id = required(),
    imageId = required(),
    bookId = required(),
    teamId = null,
    userId = required(),
    showInModal,
    showInCard
  } = {}) {
    await seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      const count = await models.attachment.update({
        showInModal,
        showInCard
      }, {
        where: {
          id: imageId
        },
        transaction: t
      });

      if (count[0] === 0) throw new Error('Image not found');
    });

    if (teamId) {
      const task = await models.task.findByPk(id, {
        include: [
          { model: models.taskTag },
          { model: models.taskRow },
          { model: models.project },
          {
            model: models.attachment,
            where: { isTaskThumbnail: true },
            required: false,
            // TODO move to constant
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
          }
        ]
      });

      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              type: 'update',
              id: id,
              value: task.get()
            }
          });
        }
      }
    }
  }

  static async complete ({
    id = required(),
    bookId = required(),
    teamId = null,
    userId = required()
  } = {}) {
    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: true
    });

    let userOrTeamId = { userId };

    if (teamId) {
      userOrTeamId = { teamId };
    }

    const task = await models.task.findOne({
      where: {
        id,
        bookId,
        ...userOrTeamId
      }
    });
    const completedAtBeforeUpdate = task.completedAt;

    if (!task) {
      throw new Error('Task not found');
    }

    const completedAt = task.completedAt ? null : new Date();

    // TODO do not use model DB methods
    await task.update({
      completedAt
    });

    // if (completedAt) {
    //   OnboardingService.updateCompletedTasks(teamId);
    // }

    if (teamId) {
      if (!task.parentId) {
        await ActivityProducerService.sendMessage({
          from: {
            completedAt: completedAtBeforeUpdate
          },
          to: {
            id,
            completedAt
          },
          creatorId: userId,
          type: 'task',
          entity: 'task'
        });
      } else {
        await ActivityProducerService.sendMessage({
          from: {
            completedAt: completedAtBeforeUpdate,
            parentId: task.parentId
          },
          to: {
            id,
            completedAt,
            parentId: task.parentId
          },
          creatorId: userId,
          type: 'task',
          entity: 'subTask'
        });
      }
    }
  }

  static async assignMember ({
    id = required(),
    memberId = required(),
    bookId = required(),
    teamId = required(),
    userId = required()
  }) {
    const success = this._assignMember({
      id,
      memberId,
      bookId,
      teamId,
      userId
    });

    if (!success) {
      throw new Error('Can\'t assign member');
    }
  }

  static async unassignMember ({
    taskId = required(),
    memberIds = required(),
    bookId = required(),
    userId = required(),
    teamId = required()
  }) {
    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: false
    });

    await TaskToMemberRepo.deleteByTaskAndTeamMemberIds(taskId, memberIds);
    const userIds = await TeamMemberRepo.getUserIdsByIds(memberIds);
    await Promise.all(userIds.map(
      async (relatedUserId) => {
        await ActivityProducerService.sendMessage({
          from: {
            id: taskId,
            relatedUserId
          },
          to: null,
          creatorId: userId,
          type: 'task',
          entity: 'task'
        });

        await NotificationService.createNotification({
          userId,
          teamId,
          bookId,
          taskId,
          targetUserId: relatedUserId,
          title: NotificationCodes.UNASSIGNED_FROM_TASK
        });
      }
    ));
  }

  static async removeTags ({
    tagIds = required(),
    taskId = required(),
    bookId = required(),
    userId = required(),
    teamId
  }) {
    await CheckService.checkUserBook({
      bookIds: [bookId],
      userId,
      teamId,
      hasClientAccess: false
    });

    await TagToTaskRepo.deleteByTaskIdAndTagIds(taskId, tagIds);
  }

  static async _assignMember ({
    id = required(),
    memberId = required(),
    bookId = required(),
    teamId = required(),
    userId = required()
  } = {}) {
    // TODO move to repo and use in high functions
    // TODO: check if we needed all includes here
    const task = await models.task.findOne({
      where: {
        id,
        bookId,
        teamId: teamId
      },
      include: [
        {
          model: models.book,
          attributes: ['id']
        },
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project },
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
        }
      ]
    });

    if (!task) {
      return false;
    }

    const teamMember = await models.teamMember.findOne({
      where: {
        id: memberId,
        teamId
      }
    });

    if (!teamMember) {
      return false;
    }

    const mention = await models.taskToMember.findOne({
      where: {
        teamMemberId: memberId,
        taskId: id
      }
    });

    if (mention) {
      await mention.destroy({
        force: true
      });
      await TaskSubscriptionRepo.deleteByTaskAndUserId(task.id, teamMember.userId);
      await NotificationService.createNotification({
        userId,
        teamId,
        bookId,
        taskId: id,
        targetUserId: teamMember.userId,
        title: NotificationCodes.UNASSIGNED_FROM_TASK
      });

      await ActivityProducerService.sendMessage({
        from: {
          id,
          relatedUserId: teamMember.userId
        },
        to: null,
        creatorId: userId,
        type: 'task',
        entity: 'task'
      });
    } else {
      await TaskSubscriptionRepo.create({
        taskId: id,
        userId: teamMember.userId
      });
      await NotificationService.createNotification({
        userId,
        teamId,
        bookId,
        taskId: id,
        targetUserId: teamMember.userId,
        title: NotificationCodes.ASSIGNED_TO_TASK
      });
      await models.taskToMember.create({
        teamMemberId: memberId,
        taskId: id
      });
      await ActivityProducerService.sendMessage({
        from: null,
        to: {
          id,
          relatedUserId: teamMember.userId
        },
        creatorId: userId,
        type: 'task',
        entity: 'task'
      });
    }

    return true;
  }

  static async order ({
    ids = required(),
    userId = required(),
    bookId = required(),
    teamId = null
  } = {}) {
    await seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      let userOrTeamId = { userId };
      if (teamId) userOrTeamId = { teamId };

      for (const [index, id] of ids.entries()) {
        await models.task.update(
          {
            order: index
          },
          {
            where: {
              id,
              bookId,
              ...userOrTeamId
            },
            transaction: t
          }
        );
      }
    });

    if (teamId) {
      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              type: 'order',
              value: ids
            }
          });
        }
      }
    }
  }

  static async changeHomeOrder ({
    ids = required(),
    teamId = null
  } = {}) {
    await seq.transaction(async t => {
      for (const [index, id] of ids.entries()) {
        await models.task.update(
          {
            homeOrder: index
          },
          {
            where: {
              id,
              teamId
            },
            transaction: t
          }
        );
      }
    });
  }

  static async getTags ({
    bookIds = required(),
    userId = required(),
    teamId = null
  } = {}) {
    await CheckService.checkUserBook({
      bookIds: bookIds,
      userId,
      teamId
    });

    return models.taskTag.findAll({
      where: {
        bookId: bookIds
      },

      order: ['id']
    });
  }

  static async toggleTag ({
    tagId = required(),
    taskId = required(),
    userId = required(),
    bookId = required(),
    teamId = null
  } = {}) {
    return seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      const tag = await models.taskTag.findOne({
        where: {
          id: tagId,
          bookId: bookId
        },
        transaction: t
      });

      let userOrTeamId = { userId };

      if (teamId) {
        userOrTeamId = { teamId };
      }

      const task = await models.task.findOne({
        where: {
          id: taskId,
          bookId,
          ...userOrTeamId
        },
        transaction: t
      });

      if (!tag || !task) {
        throw new Error('Cannot find tag or task');
      }

      const tagToTask = await models.tagToTask.findOne({
        where: {
          tagId,
          taskId
        },
        transaction: t
      });

      if (tagToTask) {
        await tagToTask.destroy({
          force: true,
          transaction: t
        });

        await ActivityProducerService.sendMessage({
          from: {
            tagName: tag.name,
            tagColor: tag.color
          },
          to: {
            id: taskId,
            tagName: null,
            tagColor: null
          },
          creatorId: userId,
          type: 'task',
          entity: 'task'
        });

        return;
      }

      await models.tagToTask.create({
        tagId,
        taskId
      }, {
        transaction: t
      });

      await ActivityProducerService.sendMessage({
        from: {
          tagName: null,
          tagColor: null
        },
        to: {
          id: taskId,
          tagName: tag.name,
          tagColor: tag.color
        },
        creatorId: userId,
        type: 'task',
        entity: 'task'
      });
    });
  }

  static async updateTagName ({
    teamId,
    id = required(),
    name = required(),
    userId = required(),
    bookId = required()
  } = {}) {
    return seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      const taskTag = await models.taskTag.findOne({
        where: {
          id,
          bookId: bookId
        },
        transaction: t
      });

      if (!taskTag) throw new Error('Tag not found');

      await taskTag.update({
        name
      });
    });
  }

  static async createRow ({
    title = required(),
    userId = required(),
    bookId = required(),
    color = required(),
    teamId = null
  } = {}) {
    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    const taskRow = await models.taskRow.create({
      title,
      bookId,
      color,
      ...userOrTeamId
    });

    if (teamId) {
      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              type: 'createRow',
              value: taskRow.get()
            }
          });
        }
      }
    }

    return taskRow.get();
  }

  static async getRows ({
    userId = required(),
    teamId = null,
    bookId = required()
  } = {}) {
    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    return models.taskRow.findAll({
      where: {
        ...userOrTeamId,
        bookId: bookId
      },
      order: ['order', 'createdAt']
    });
  }

  static async updateRow ({
    id = required(),
    title,
    color,
    userId = required(),
    bookId = required(),
    teamId = null
  } = {}) {
    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    const count = await models.taskRow.update({
      title,
      color
    }, {
      where: {
        id,
        bookId,
        ...userOrTeamId
      }
    });

    if (count[0] === 0) throw new Error('task row not found');

    if (teamId) {
      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              id: id,
              type: 'updateRow',
              value: {
                title,
                color
              }
            }
          });
        }
      }
    }
  }

  static async deleteRow ({
    id = required(),
    userId = required(),
    bookId = required(),
    teamId = null
  } = {}) {
    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    await models.taskRow.destroy({
      where: {
        id,
        bookId,
        ...userOrTeamId
      },
      force: true,
      paranoid: false
    });

    // TODO refactor
    if (teamId) {
      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              type: 'deleteRow',
              value: id
            }
          });
        }
      }
    }
  }

  static async orderRow ({
    ids = required(),
    userId = required(),
    bookId = required(),
    teamId = null
  } = {}) {
    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    await seq.transaction(async t => {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      for (const [index, id] of ids.entries()) {
        await models.taskRow.update(
          {
            order: index
          },
          {
            where: {
              id,
              bookId,
              ...userOrTeamId
            },
            transaction: t
          }
        );
      }
    });

    if (teamId) {
      const members = await models.teamAccess.findAll({
        where: {
          teamId,
          bookId,
          projectId: null
        }
      });

      for (const member of members) {
        if (member.userId !== userId) {
          SocketNotifyService.notify({
            userId: member.userId,
            name: 'task',
            payload: {
              bookId: bookId,
              type: 'orderRow',
              value: ids
            }
          });
        }
      }
    }
  }

  static async deleteByIds ({
    ids = required(),
    bookId = required(),
    teamId = required(),
    userId = required()
  }) {
    // TODO rework
    for (const id of ids) {
      await this.delete({
        teamId,
        userId,
        id,
        bookId
      });
    }
  }

  /**
   * @param taskId {number}
   * @param userId {number}
   * @param teamId {number}
   * @return {Promise<void>}
   */
  static async unsubscribe ({ taskId, userId, teamId }) {
    const task = await TaskRepo.getById(taskId);

    if (!task || !task.bookId) {
      throw new CustomError('Task not found', 404);
    }

    try {
      await CheckService.checkUserBook({
        bookIds: [task.bookId],
        userId,
        teamId,
        hasClientAccess: false
      });
    } catch (e) {
      throw new CustomError('Permission denied', 403);
    }

    const success = await TaskSubscriptionRepo.deleteByTaskAndUserId(taskId, userId);

    if (!success) {
      throw new CustomError('Can not unsubscribe from task', 404);
    }
  }

  /**
   * @param taskId {number}
   * @param userId {number}
   * @param teamId {number}
   * @return {Promise<void>}
   */
  static async subscribe ({ taskId, userId, teamId }) {
    const task = await TaskRepo.getById(taskId);

    if (!task || !task.bookId) {
      throw new CustomError('Task not found', 404);
    }

    try {
      await CheckService.checkUserBook({
        bookIds: [task.bookId],
        userId,
        teamId,
        hasClientAccess: false
      });
    } catch (e) {
      throw new CustomError('Permission denied', 403);
    }

    await TaskSubscriptionRepo.create({
      taskId,
      userId
    });
  }

  static async revertMoveToBook ({
    taskId
  }) {
    const taskToRevert = await TaskRepo.getById(taskId);

    if (!taskToRevert || !taskToRevert.movedFromTaskId) {
      throw new CustomError('Task can\'t be moved back to book');
    }

    await TaskRepo.restoreById(taskToRevert.movedFromTaskId);
    await TaskRepo.permanentDeleteById(taskId);
  }
}

module.exports = TaskService;
