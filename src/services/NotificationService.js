'use strict';
const models = require('../models');
const { required } = require('../utils');
const SocketNotifyService = require('./SocketNotifyService');
const moment = require('moment');
const EmailNotificationProducerService = require('./EmailNotificationProducerService');
const { emailNotificationType } = require('../core/email-notification-type');
const { Op } = require('sequelize');
const NotificationCodes = require('../core/NotificationCodes');
const oneSignal = require('../libs/oneSignal');
const { removeHtmlTagsFromString, generateFELink } = require('../utils');

class NotificationService {
  static async createNotification ({
    userId = required(),
    targetUserId,
    teamId = required(),
    title = required(),
    bookId,
    projectId,
    taskId,
    attachmentId,
    chatId,
    commentId,
    chatMessageId,
    oldBookTitle,
    message
  } = {}) {
    const category = title < 100 ? 'personal' : 'general';

    if (category === 'general') {
      console.log('General notifications are deprecated');
      return;
    }

    await this._create({
      userId,
      teamId,
      title,
      category,
      bookId,
      projectId,
      taskId,
      attachmentId,
      chatId,
      commentId,
      chatMessageId,
      oldBookTitle,
      message,
      targetUserId: targetUserId || userId
    });
  }

  static async _create ({
    userId = required(),
    targetUserId = required(),
    teamId = required(),
    title = required(),
    category = required(),
    bookId,
    projectId,
    taskId,
    attachmentId,
    chatId,
    commentId,
    chatMessageId,
    oldBookTitle,
    message
  } = {}) {
    if (userId === targetUserId) {
      return;
    }

    const user = await models.user.findByPk(userId);

    if (user?.isClient) {
      return;
    }

    const categories = ['personal', 'general'];

    if (!categories.includes(category)) {
      return;
    }

    const member = await models.teamMember.findOne({
      where: {
        userId,
        teamId
      },
      include: [
        {
          model: models.user,
          attributes: ['id'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        }
      ]
    });

    if (!member) {
      return;
    }

    const inbox = await models.inbox.findOne({
      where: {
        userId: targetUserId,
        teamId
      }
    });

    if (!inbox) {
      return;
    }

    const notification = await models.notification.create({
      title,
      category,
      userId: targetUserId,
      teamId,
      teamMemberId: member.id,
      inboxId: inbox.id,
      bookId,
      projectId,
      taskId,
      attachmentId,
      chatId,
      commentId,
      chatMessageId,
      oldBookTitle,
      status: 'unread',
      message
    });

    const now = moment();
    const mutedUntil = moment(inbox.mutedUntil);

    if (now.isBefore(mutedUntil)) {
      return;
    }

    await this._send({
      id: notification.id,
      userId: targetUserId,
      teamId
    });

    return notification.id;
  }

  static async _send ({
    id = required(),
    userId = required(),
    teamId = required()
  }) {
    const notification = await models.notification.findOne({
      where: {
        id: id,
        teamId,
        userId
      },
      include: [ // TODO add attribute for each model
        { model: models.team },
        {
          model: models.user,
          attributes: ['id', 'email'],
          include: [{
            model: models.profile,
            attributes: ['firstName', 'lastName', 'color', 'timezone']
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
          model: models.project,
          attributes: {
            exclude: ['state', 'body', 'document']
          }
        },
        { model: models.book },
        {
          model: models.chat,
          include: {
            model: models.message,
            attributes: ['text'],
            separate: true,
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: {
              model: models.user,
              attributes: ['id'],
              include: [
                {
                  model: models.profile,
                  attributes: ['firstName', 'lastName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }
              ]
            }
          }
        },
        { model: models.attachment },
        {
          model: models.task,
          attributes: {
            exclude: ['additionalInfo']
          }
        },
        { model: models.inbox },
        {
          model: models.message,
          as: 'chatMessage',
          include: {
            model: models.chat,
            include: {
              model: models.privateChat
            }
          }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!notification) {
      return;
    }

    if (notification.category === 'personal') {
      if (this.getInboxEmailSettingByNotificationTitle(notification.inbox, notification.title)) {
        await EmailNotificationProducerService.sendImmediatelyMessage(
          id,
          emailNotificationType.personalImmediately
        );
      }

      if (this.getInboxPushSettingByNotificationTitle(notification.inbox, notification.title)) {
        const pushMessageData = this.generatePushMessageData(notification);

        if (pushMessageData) {
          try {
            await oneSignal.sendMessage({
              userId,
              name: 'push_notification',
              content: pushMessageData.content,
              url: pushMessageData.url
            });
          } catch (e) {
            console.log(e);
          }
        }
      }
    }

    SocketNotifyService.notify({
      userId,
      name: 'inbox',
      payload: {
        type: 'create',
        message: notification
      }
    });
  }

  /**
   * @param notification {*}
   * @returns {{
   *   content: string,
   *   url: string
   * } | null}
   */
  static generatePushMessageData (notification) {
    const teamLink = notification.team.link;

    switch (notification.title) {
      case (NotificationCodes.BOOK_MEMBER_ADD): {
        const bookName = notification.book?.title;

        if (!bookName) {
          return null;
        }

        return {
          content: `You're invited for a project "${removeHtmlTagsFromString(bookName)}"`,
          url: generateFELink({
            teamLink,
            url: `/overview/${notification.book?.id}`
          })
        };
      }

      case (NotificationCodes.MENTIONED_IN_CHAT): {
        const entity = 'chat';

        return {
          content: `You're mentioned in ${entity}`,
          url: generateFELink({
            teamLink,
            url: `/chat?chatId=${notification.chat.id}`
          })
        };
      }

      case (NotificationCodes.MENTIONED_IN_PAGE): {
        const entity = 'page';

        return {
          content: `You're mentioned in ${entity}`,
          url: generateFELink({
            teamLink,
            url: `/space/${notification.project?.bookId}?page=${notification.projectId}`
          })
        };
      }

      case (NotificationCodes.MENTIONED_IN_TASK): {
        const entity = 'task';

        return {
          content: `You're mentioned in ${entity}`,
          url: generateFELink({
            teamLink,
            url: `/task-board/${notification.task?.bookId}?taskId=${notification.taskId}`
          })
        };
      }

      case (NotificationCodes.ROLE_UPDATE): {
        const message = notification.message;

        if (!message) {
          return null;
        }

        return {
          content: message,
          url: generateFELink({
            teamLink,
            url: '/'
          })
        };
      }

      case (NotificationCodes.ASSIGNED_TO_TASK): {
        const taskName = notification.task?.title;

        if (!taskName) {
          return null;
        }

        return {
          content: `You're assigned to a task "${removeHtmlTagsFromString(taskName)}"`,
          url: generateFELink({
            teamLink,
            url: `/task-board/${notification.task?.bookId}?taskId=${notification.taskId}`
          })
        };
      }

      case (NotificationCodes.UNASSIGNED_FROM_TASK): {
        const taskName = notification.task?.title;

        if (!taskName) {
          return null;
        }

        return {
          content: `You're unassigned from a task "${removeHtmlTagsFromString(taskName)}"`,
          url: generateFELink({
            teamLink,
            url: `/task-board/${notification.task?.bookId}?taskId=${notification.taskId}`
          })
        };
      }

      case (NotificationCodes.TASK_DEADLINE): {
        const taskName = notification.task?.title;

        if (!taskName) {
          return null;
        }

        return {
          content: `A task "${removeHtmlTagsFromString(taskName)}" is due today`,
          url: generateFELink({
            teamLink,
            url: `/task-board/${notification.task?.bookId}?taskId=${notification.taskId}`
          })
        };
      }

      case (NotificationCodes.NEW_PRIVATE_MESSAGE): {
        const message = notification?.chatMessage;

        if (!message || !message.chat?.privateChats.length) {
          return null;
        }

        const senderName = `${notification.teamMember.user.profile.firstName} ${notification.teamMember.user.profile.lastName}`;

        return {
          content: `${senderName} send you a private chat message "${removeHtmlTagsFromString(message.text)}"`,
          url: generateFELink({
            teamLink,
            url: `/chat?chatId=${message.chatId}`
          })
        };
      }

      default: {
        return null;
      }
    }
  }

  /**
   * @param inbox {{
   *  emailReceiveTaskDeadlineNotifications: boolean,
   *  emailProjectInvite: boolean,
   *  emailRoleChange: boolean,
   *  emailTaskAssign: boolean,
   *  emailTaskUnassign: boolean,
   *  emailTaskChange: boolean,
   *  emailTaskCommentAdd: boolean,
   *  emailTaskCompleted: boolean,
   *  emailChatMessageReceive: boolean
   * }}
   * @param title {number}
   * @return boolean
   */
  static getInboxEmailSettingByNotificationTitle (inbox, title) {
    if (!inbox) {
      return false;
    }

    const notificationTitleInboxEmailSettingMap = {
      [NotificationCodes.TASK_DEADLINE]: 'emailReceiveTaskDeadlineNotifications',
      [NotificationCodes.BOOK_MEMBER_ADD]: 'emailProjectInvite',
      [NotificationCodes.BOOK_MEMBER_REMOVE]: 'emailProjectInvite',
      [NotificationCodes.ROLE_UPDATE]: 'emailRoleChange',
      [NotificationCodes.ASSIGNED_TO_TASK]: 'emailTaskAssign',
      [NotificationCodes.UNASSIGNED_FROM_TASK]: 'emailTaskUnassign',
      [NotificationCodes.NEW_PRIVATE_MESSAGE]: 'emailChatMessageReceive',
      [NotificationCodes.MENTIONED_IN_CHAT]: 'emailMentionCreate',
      [NotificationCodes.MENTIONED_IN_TASK]: 'emailMentionCreate',
      [NotificationCodes.MENTIONED_IN_PAGE]: 'emailMentionCreate'
    };
    const settingsName = notificationTitleInboxEmailSettingMap[title];

    if (!settingsName) {
      return false;
    }

    return inbox[settingsName] || false;
  }

  /**
   * @param inbox {{
   *  pushReceiveTaskDeadlineNotifications: boolean,
   *  pushProjectInvite: boolean,
   *  pushRoleChange: boolean,
   *  pushTaskAssign: boolean,
   *  pushTaskUnassign: boolean,
   *  pushTaskChange: boolean,
   *  pushTaskCommentAdd: boolean,
   *  pushTaskCompleted: boolean,
   *  pushChatMessageReceive: boolean
   * }}
   * @param title {number}
   * @return boolean
   */
  static getInboxPushSettingByNotificationTitle (inbox, title) {
    if (!inbox) {
      return false;
    }

    const notificationTitleInboxPushSettingMap = {
      [NotificationCodes.TASK_DEADLINE]: 'pushReceiveTaskDeadlineNotifications',
      [NotificationCodes.BOOK_MEMBER_ADD]: 'pushProjectInvite',
      [NotificationCodes.BOOK_MEMBER_REMOVE]: 'pushProjectInvite',
      [NotificationCodes.ROLE_UPDATE]: 'pushRoleChange',
      [NotificationCodes.ASSIGNED_TO_TASK]: 'pushTaskAssign',
      [NotificationCodes.UNASSIGNED_FROM_TASK]: 'pushTaskUnassign',
      [NotificationCodes.NEW_PRIVATE_MESSAGE]: 'pushChatMessageReceive',
      [NotificationCodes.MENTIONED_IN_CHAT]: 'pushMentionCreate',
      [NotificationCodes.MENTIONED_IN_TASK]: 'pushMentionCreate',
      [NotificationCodes.MENTIONED_IN_PAGE]: 'pushMentionCreate'
    };
    const settingsName = notificationTitleInboxPushSettingMap[title];

    if (!settingsName) {
      return false;
    }

    return inbox[settingsName] || false;
  }

  static async getAll ({
    userId = required(),
    teamId = required(),
    limit = 50
  } = {}) {
    const include = [
      { model: models.team },
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
      { model: models.project },
      { model: models.book },
      {
        model: models.chat,
        include: {
          model: models.message,
          attributes: ['text'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      },
      { model: models.attachment },
      { model: models.task },
      { model: models.comment },
      {
        model: models.message,
        as: 'chatMessage',
        include: {
          model: models.chat,
          include: {
            model: models.privateChat
          }
        }
      }
    ];

    const personal = await models.notification.findAll({
      where: {
        userId,
        teamId,
        category: 'personal'
      },
      include: include,
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    const general = await models.notification.findAll({
      where: {
        userId,
        teamId,
        category: 'general',
        title: { [Op.lt]: 1000 }
      },
      include: include,
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    return {
      personal,
      general
    };
  }

  static async getByBookId ({
    userId = required(),
    teamId = required(),
    bookId = required(),
    limit = 50
  } = {}) {
    const include = [
      { model: models.team },
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
      { model: models.project },
      { model: models.book },
      {
        model: models.chat,
        include: {
          model: models.message,
          attributes: ['text'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      },
      { model: models.attachment },
      { model: models.task },
      { model: models.comment }
    ];

    const result = await models.notification.findAndCountAll({
      where: {
        userId,
        teamId,
        bookId,
        category: 'general'
      },
      include: include,
      order: [['createdAt', 'DESC']],
      limit: limit
    });

    return {
      count: result.count,
      notifications: result.rows
    };
  }

  static async delete ({
    id = required(),
    userId = required(),
    teamId = required()
  } = {}) {
    await models.notification.destroy({
      where: {
        id,
        userId,
        teamId
      }
    });
  }

  static async deleteManny ({
    userId,
    teamId
  }) {
    await models.notification.destroy({
      where: {
        userId,
        teamId
      },
      force: true
    });
  }

  static async updateStatus ({
    ids = required(),
    userId = required(),
    teamId = required()
  } = {}) {
    const count = await models.notification.update({
      status: 'read'
    },
    {
      where: {
        id: ids,
        userId,
        teamId
      }
    });

    if (count === 0) throw new Error('Notification not found');
  }
}

module.exports = NotificationService;
