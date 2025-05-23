const moment = require('moment-timezone');
const sqs = require('../libs/sqs');
const log = require('../log')('app');
const { required } = require('../utils/index');
const { sendgrid } = require('../libs/index');
const config = require('../config/index');
const NotificationRepo = require('../repos/NotificationRepo');
const InboxActivityRepo = require('../repos/InboxActivityRepo');
const { emailNotificationType } = require('../core/email-notification-type');
const NotificationCodes = require('../core/NotificationCodes');
const {
  generateFELink,
  removeHtmlTagsFromString
} = require('../utils');
const InboxRepo = require('../repos/InboxRepo');
const UserRepo = require('../repos/UserRepo');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const TaskRepo = require('../repos/TaskRepo');
const { Op } = require('sequelize');
const dailyTaskTips = require('../core/dailyTaskTips');
const models = require('../models');
const { pluralizeWord } = require('../core/helpers');
const queueName = process.env.SQS_QUERY_NAME_EMAIL_NOTIFICATION;

const TITLE_ENTITY_MAP = {
  [NotificationCodes.TASK_DEADLINE]: 'task',
  [NotificationCodes.BOOK_MEMBER_ADD]: 'project',
  [NotificationCodes.BOOK_MEMBER_REMOVE]: 'project',
  [NotificationCodes.ROLE_UPDATE]: 'user',
  [NotificationCodes.ASSIGNED_TO_TASK]: 'task',
  [NotificationCodes.UNASSIGNED_FROM_TASK]: 'task',
  [NotificationCodes.NEW_PRIVATE_MESSAGE]: 'private-chat',
  [NotificationCodes.MENTIONED_IN_CHAT]: 'chat',
  [NotificationCodes.MENTIONED_IN_TASK]: 'task',
  [NotificationCodes.MENTIONED_IN_PAGE]: 'page'
};

class EmailNotificationConsumerService {
  static async run () {
    while (true) {
      try {
        await this.process();
      } catch (e) {
        log.error(e);

        if (e.Code === 'AWS.SimpleQueueService.NonExistentQueue') {
          log.error(`queueName: ${queueName}`);
          process.exit(1);
        }
      }
    }
  }

  static async process () {
    const [message] = await sqs.receiveMessage({
      queueName,
      visibilityTimeoutInSeconds: 300
    });

    if (!message) {
      log.info('Empty message');

      return;
    }

    log.info(message);

    try {
      const {
        userId,
        operations,
        notificationId
      } = this.parseAttributes(message.attributes);

      const operationHandlerMap = {
        [emailNotificationType.personalWeekly]: () => this.sendWeeklyPersonalEmails({
          userId
        }),
        [emailNotificationType.personalImmediately]: () => this.sendImmediatelyEmail(notificationId),
        [emailNotificationType.dailyTasks]: () => this.sendDailyTasks({ userId })
      };

      await Promise.all(operations.map(async (operation) => {
        await operationHandlerMap[operation]();
      }));
    } catch (e) {
      log.error(e);
    }

    await sqs.deleteMessage({
      queueName,
      receiptHandle: message.handler
    });
  }

  /**
   * @param notification {*}
   * @param entity {string}
   * @param teamLink {string}
   * @returns {string}
   */
  static generateEntityUrl ({
    notification,
    entity,
    teamLink
  }) {
    switch (entity) {
      case 'task': {
        const url = notification.task?.parentId
          ? `/task-board/${notification.bookId}?highlight=${notification.taskId}&parentId=${notification.task?.parentId}`
          : `/task-board/${notification.bookId}?highlight=${notification.taskId}`;

        return generateFELink({
          teamLink,
          url
        });
      }

      case 'project': {
        return generateFELink({
          teamLink,
          url: `/overview/${notification.bookId}`
        });
      }

      case 'page': {
        return generateFELink({
          teamLink,
          url: `/space/${notification.bookId}?page=${notification.project?.id}`
        });
      }

      case 'private-chat': {
        return generateFELink({
          teamLink,
          url: `?chatId=${notification.chatId}`
        });
      }

      default: {
        return generateFELink({
          teamLink,
          url: '/'
        });
      }
    }
  }

  static parseAttributes (attributes = required()) {
    return {
      operations: [...new Set(attributes.operations.split(','))],
      userId: attributes?.userId ? parseInt(attributes?.userId) : null,
      notificationId: attributes?.notificationId ? parseInt(attributes?.notificationId) : null
    };
  }

  static async sendImmediatelyEmail (notificationId = required()) {
    const notification = await NotificationRepo.getById(notificationId);

    log.info('notification', JSON.stringify(notification, null, 2));

    if (!notification) {
      return;
    }

    const fullName = `${notification.user.profile.firstName} ${notification.user.profile.lastName}`;
    const creatorName = `${notification.teamMember.user.profile.firstName} ${notification.teamMember.user.profile.lastName}`;
    const timezone = notification.user.profile.timezoneName;
    const date = moment.tz(notification.createdAt, timezone).format('MMM DD Y HH:mm');
    const email = notification.user.email.toLowerCase();
    const entity = TITLE_ENTITY_MAP[notification.title];

    log.info('entity', entity);

    if (!entity) {
      return;
    }

    const url = this.generateEntityUrl({
      teamName: notification.team.name,
      entity,
      notification
    });

    const notificationData = {
      message: notification.message
        ? removeHtmlTagsFromString(notification.message)
        : null,
      chatMessage: {
        text: notification.chatMessage?.text
          ? removeHtmlTagsFromString(notification.chatMessage.text)
          : null
      },
      task: {
        title: notification.task?.title
          ? removeHtmlTagsFromString(notification.task.title)
          : null
      },
      book: {
        title: notification.book?.title
          ? removeHtmlTagsFromString(notification.book.title)
          : null
      }
    };

    await sendgrid.send({
      apiKey: process.env.SENDGRID_API_KEY,
      to: email,
      from: config.team.emailFrom,
      subject: 'New notification',
      templateId: process.env.SENDGRID_ACTIVITY_TEMPLATE_ID,
      params: {
        ...notificationData,
        title: notification.title,
        type: 'notification',
        fullName,
        creatorName,
        date,
        url
      },
      unsubscribeGroupId: Number(process.env.SENDGRID_NOTIFICATION_UNSUBSCRIBE_GROUP_ID)
    });
    log.info(`Sent immediately email notification id=${notificationId}`);
  }

  // TODO can require optimization
  static async sendWeeklyPersonalEmails ({
    userId = required()
  }) {
    const user = await UserRepo.getById({
      id: userId
    });
    const fullName = `${user.profile.firstName} ${user.profile.lastName}`;
    const email = user.email.toLowerCase();
    const timezone = user.profile.timezoneName;
    const sevenDaysBefore = moment().subtract(7, 'd').toDate();
    const notifications = await NotificationRepo.getAllByUserIdTitleCategoryCreatedAt(
      userId,
      Object.keys(TITLE_ENTITY_MAP).map((key) => parseInt(key)),
      'personal',
      sevenDaysBefore
    );

    notifications.forEach((notification) => {
      const creatorName = `${notification.teamMember.user.profile.firstName} ${notification.teamMember.user.profile.lastName}`;
      const date = moment.tz(notification.createdAt, timezone).format('MMM DD Y HH:mm');
      const entity = TITLE_ENTITY_MAP[notification.title];

      if (!entity) {
        return;
      }

      const url = this.generateEntityUrl({
        teamName: notification.team.name,
        entity,
        notification
      });

      delete notification.user;
      delete notification.teamMember;

      notification.creatorName = creatorName;
      notification.date = date;
      notification.url = url;
    });

    const inboxId = await InboxRepo.getByUserId(userId);
    const activities = await InboxActivityRepo.getAllActivitiesByInboxIdTypeCreatedAt(
      inboxId.id,
      'private',
      sevenDaysBefore
    );

    const activitiesValues = activities.map((activity) => ({
      relatedUserName: activity.relatedUser
        ? `${activity.relatedUser.profile.firstName} ${activity.relatedUser.profile.lastName}`
        : null,
      url: generateFELink({
        teamLink: activity.taskActivity.task.team.link,
        url: `/task-board/${activity.taskActivity.task.bookId}?taskId=${activity.taskActivity.task.id}`
      }),
      date: moment.tz(activity.createdAt, timezone).format('MMM DD Y HH:mm'),
      type: 'task',
      title: 'Task update',
      data: activity.data,
      creatorName: `${activity.creator.profile.firstName} ${activity.creator.profile.lastName}`,
      createdAt: activity.createdAt
    }));

    const values = notifications.concat(activitiesValues).sort((prev, next) => next.createdAt - prev.createdAt);

    if (!values.length) {
      return;
    }

    await sendgrid.send({
      apiKey: process.env.SENDGRID_API_KEY,
      to: email,
      from: config.team.emailFrom,
      subject: 'About you weekly notifications summary',
      templateId: process.env.SENDGRID_WEEKLY_TEMPLATE_ID,
      params: {
        values,
        fullName
      },
      unsubscribeGroupId: Number(process.env.SENDGRID_WEEKLY_UNSUBSCRIBE_GROUP_ID)
    });
    log.info(`Sent weekly email personal notifications/activities to user id=${userId} category`);
  }

  static mapTasks (tasks, teamMember) {
    return tasks.map(task => {
      const path = task.parentId
        ? `/task-board/${task.bookId}?taskId=${task.id}&parentId=${task.parentId}`
        : `/task-board/${task.bookId}?taskId=${task.id}`;

      const url = generateFELink({
        teamLink: teamMember?.team?.link || 'team',
        url: path
      });

      const teamMembers = task.teamMembers.map(member => {
        const initials = `${member.user?.profile?.firstName[0]}${member.user?.profile?.lastName[0]}`;
        return {
          initials,
          avatar: member.user?.avatar?.url || null
        };
      });

      const bookIcon = `https://helloivy-icons.s3.eu-central-1.amazonaws.com/${task?.book?.icon || 'vaporwave'}.png`;

      return {
        title: removeHtmlTagsFromString(task.title || ''),
        bookIcon,
        teamMembers,
        url
      };
    });
  }

  static generateRandomSubject ({
    day,
    month,
    fullName,
    overdueTasks
  }) {
    const date = new Date().getDate();
    const pluralizedTasks = pluralizeWord('task', overdueTasks.length);

    if (date % 5 === 0) {
      const subjects = [
        `Hi ${fullName}, you still have ${overdueTasks.length} open ${pluralizedTasks}`,
        `Here's a task you still need to complete ${fullName}: ${this.getRandomTaskTitle(overdueTasks)}`
      ];

      const index = Math.floor(Math.random() * 2);
      return subjects[index];
    }

    return `Task overview for ${month} ${day} → You have ${overdueTasks.length} overdue ${pluralizedTasks}`;
  }

  static getRandomTaskTitle (tasks) {
    const index = Math.floor(Math.random() * tasks.length);

    return tasks[index]?.title || 'Task title';
  }

  static async sendDailyTasks ({
    userId = required()
  }) {
    const user = await UserRepo.getById({
      id: userId
    });

    const fullName = user.profile.firstName;
    const email = user.email.toLowerCase();
    const timezone = user.profile.timezoneName;
    const month = moment.tz(timezone).format('MMMM');
    const day = moment.tz(timezone).date();

    const teamMember = await TeamMemberRepo.getByUserId(userId);

    if (!teamMember) {
      return;
    }

    const tasksForToday = await TaskRepo.getAllByDateRangeAndMemberIds({
      teamMemberIds: [teamMember.id],
      dateRangeCondition: {
        [Op.and]: [
          {
            endDate: {
              [Op.gte]: moment.tz(timezone).format('YYYY-MM-DD')
            }
          },
          {
            startDate: {
              [Op.lte]: moment.tz(timezone).format('YYYY-MM-DD')
            }
          }
        ]
      }
    });

    const overdueTasks = await TaskRepo.getAllByDateRangeAndMemberIds({
      teamMemberIds: [teamMember.id],
      dateRangeCondition: {
        endDate: {
          [Op.lt]: moment.tz(timezone).format('YYYY-MM-DD')
        }
      }
    });

    const tasksForTodayMap = this.mapTasks(tasksForToday, teamMember);
    const overdueTasksMap = this.mapTasks(overdueTasks, teamMember);

    const index = Math.floor(Math.random() * dailyTaskTips.length - 1);

    const tip = dailyTaskTips[index];

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    const subjectForTaskEmail = `Task overview for ${month} ${day} → ${tasksForTodayMap.length} ${pluralizeWord('task', tasksForTodayMap.length)} planned and ${overdueTasks.length} overdue`;

    const subject = tasksForTodayMap.length
      ? subjectForTaskEmail
      : this.generateRandomSubject();

    try {
      await sendgrid.send({
        apiKey: process.env.SENDGRID_API_KEY,
        to: email,
        from: config.notification.emailFrom,
        name: config.notification.emailName,
        subject,
        templateId: config.notification.emailTemplateId,
        params: {
          values: tasksForTodayMap,
          overdueTasks: overdueTasksMap,
          fullName,
          tip,
          overdueCount: `${overdueTasks.length}`
        },
        unsubscribeGroupId: Number(process.env.SENDGRID_DAILY_UNSUBSCRIBE_GROUP_ID)
      });
    } catch (error) {
      log.error(error);

      models.log.create({
        code: 400,
        message: error instanceof Error ? error.message : error,
        stack: error?.stack,
        userId: userId,
        teamId: teamMember?.team?.id
      }).catch((e) => {
        console.log('log-creating', e);
      });
    }

    log.info(`Sent daily tasks to user id=${userId} category`);
  }
}

module.exports = EmailNotificationConsumerService;
