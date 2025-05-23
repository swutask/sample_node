const sqs = require('../libs/sqs');
const log = require('../log')('app');
const { sendgrid, oneSignal } = require('../libs');
const config = require('../config');
const models = require('../models');
const ReminderRepo = require('../repos/ReminderRepo');
const { generateFELink, removeHtmlTagsFromString } = require('../utils');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const moment = require('moment-timezone');
const SocketNotifyService = require('./SocketNotifyService');
const InboxRepo = require('../repos/InboxRepo');
const InboxActivityRepo = require('../repos/InboxActivityRepo');
const ActivityRepo = require('../repos/ActivityRepo');

const queueName = process.env.SQS_QUERY_NAME_REMINDER;

async function run () {
  while (true) {
    try {
      await processMessage();
    } catch (e) {
      log.error(e);

      if (e.Code === 'AWS.SimpleQueueService.NonExistentQueue') {
        log.error(`queueName: ${queueName}`);
        process.exit(1);
      }
    }
  }
}

async function processMessage () {
  const [message] = await sqs.receiveMessage({
    queueName,
    visibilityTimeoutInSeconds: 300
  });

  if (!message) {
    return;
  }

  try {
    if (message.body?.id) {
      await processReminder(message.body.id);
    }
  } catch (e) {
    log.error(e);
  }

  await sqs.deleteMessage({
    queueName,
    receiptHandle: message.handler
  });
}

async function sendReminderToEmail ({
  url,
  time,
  user,
  title,
  reminder
} = {}) {
  const allowSendToEmail = await ReminderRepo.checkIfAllowedSendReminderToEmail(user.id);

  if (allowSendToEmail) {
    const teamMembers = reminder.task.teamMembers.map(member => {
      const initials = `${member.user?.profile?.firstName[0]}${member.user?.profile?.lastName[0]}`;
      return {
        initials,
        avatar: member.user?.avatar?.url || null
      };
    });

    const bookIcon = `https://helloivy-icons.s3.eu-central-1.amazonaws.com/${reminder.task?.book?.icon || 'vaporwave'}.png`;

    const emailData = {
      fullName: user.profile.firstName,
      task: {
        title,
        bookIcon: bookIcon,
        url: url,
        teamMembers: teamMembers
      },
      time
    };

    console.log(`Sending reminder email to ${user.email} at ${time}`);

    await sendgrid.send({
      apiKey: process.env.SENDGRID_API_KEY,
      to: user.email.toLowerCase(),
      from: config.reminder.emailFrom,
      subject: `Reminder: ${title}`,
      templateId: config.reminder.emailTemplateId,
      params: emailData
      // unsubscribeGroupId: Number(process.env.SENDGRID_NOTIFICATION_UNSUBSCRIBE_GROUP_ID)
    });
  }
}

async function sendPushReminder ({
  user,
  title,
  url
} = {}) {
  const allowSendToPush = await ReminderRepo.checkIfAllowedSendPushReminder(user.id);

  if (allowSendToPush) {
    await oneSignal.sendMessage({
      content: `⏰ Reminder: ${title}`,
      name: 'push_activity',
      userId: user.id,
      url: url
    });

    console.log('Handler reminder push notification');
  }
}

async function createInboxReminder ({
  userId,
  reminderId
} = {}) {
  if (!reminderId) {
    throw new Error('Reminder id is required');
  }

  const reminder = await ReminderRepo.getReminderById(reminderId);

  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const inboxes = await InboxRepo.getAllByUserIds([reminder.userId]);

  const createdActivityIds = await ActivityRepo.bulkCreateReturnIds([{
    data: {
      reminderId: reminder.id,
      remindAt: reminder.remindAt,
      taskTitle: reminder.task.title,
      taskId: reminder.taskId,
      taskParentId: reminder.task.parentId,
      column: 'remindAt'
    },
    creatorId: userId,
    type: 'task',
    createdAt: new Date()
  }]);

  await InboxActivityRepo.bulkCreateReturnIds([
    {
      activityId: createdActivityIds[0],
      inboxId: inboxes[0].id,
      teamId: reminder.task.teamId,
      type: 'private',
      createdAt: new Date(),
      taskId: reminder.taskId
    }
  ]);

  const activities = await ActivityRepo.getAllByIds(createdActivityIds);
  console.log(activities);

  activities.forEach((activity) => {
    SocketNotifyService.notify({
      userId: reminder.userId,
      name: 'inboxActivity',
      payload: {
        type: 'addInboxActivity',
        inboxId: inboxes[0].id,
        inboxType: 'private',
        activity
      }
    });
  });
}

/**
 * @param reminderId {number}
 * @return {Promise<void>}
 */
async function processReminder (reminderId) {
  const reminder = await ReminderRepo.getReminderById(reminderId);

  if (!reminder) {
    log.error(`Reminder not found reminderId: ${reminderId}`);
    return;
  }

  const teamMember = await TeamMemberRepo.getByUserId(reminder.user.id);

  try {
    const user = reminder.user;

    const path = reminder.task.parentId
      ? `/task-board/${reminder.task.bookId}?taskId=${reminder.task.id}&parentId=${reminder.task.parentId}`
      : `/task-board/${reminder.task.bookId}?taskId=${reminder.task.id}`;

    const url = generateFELink({
      teamLink: teamMember?.team?.link || 'team',
      url: path
    });

    const time = moment.tz(reminder.remindAt, reminder.user.profile.timezoneName).format('h:mm A, dddd, MMMM Do');

    const title = removeHtmlTagsFromString(reminder.task.title || 'Task title');

    // send Email
    await sendReminderToEmail({ url, time, user, title, reminder });
    // send Push
    await sendPushReminder({ user, title, url, time });
    // send Inbox
    await createInboxReminder({
      userId: user.id,
      reminderId: reminder.id
    });
  } catch (error) {
    log.error(error);

    models.log.create({
      code: 400,
      message: error instanceof Error ? error.message : error,
      stack: error?.stack,
      userId: reminder?.user?.id || 1,
      teamId: teamMember?.teamId || 1
    }).catch((e) => {
      console.log('log-creating', e);
    });
  }
}

module.exports = {
  run
};
