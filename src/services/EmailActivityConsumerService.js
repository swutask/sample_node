const sqs = require('../libs/sqs');
const log = require('../log')('app');
const ActivityRepo = require('../repos/ActivityRepo');
const { UserRepo } = require('../repos/index');
const moment = require('moment-timezone');
const { sendgrid } = require('../libs');
const config = require('../config');
const TaskRepo = require('../repos/TaskRepo');
const { generateFELink } = require('../utils');

const queueName = process.env.SQS_QUERY_NAME_EMAIL_ACTIVITY;

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
    const { activityId } = parseAttributes(message.attributes);
    await processActivity(activityId);
  } catch (e) {
    log.error(e);
  }

  await sqs.deleteMessage({
    queueName,
    receiptHandle: message.handler
  });
}

/**
 * @param attributes {{
 *  [p:string]: string
 * }}
 * @return {{
 *  activityId: number,
 * }}
 */
function parseAttributes (attributes) {
  return {
    activityId: parseInt(attributes.activityId)
  };
}

/**
 * @param activityId {number}
 * @return {Promise<void>}
 */
async function processActivity (activityId) {
  const activity = await ActivityRepo.getByIdWithRelated(activityId);

  if (!activity) {
    throw new Error('Activity not found');
  }

  const activityTypes = [
    'taskActivity',
    'inboxActivity',
    'bookActivity'
  ];

  let type = null;

  for (const activityType of activityTypes) {
    if (activity[activityType]) {
      type = activityType;

      break;
    }
  }

  let usersData = [];
  let emailContent = {};

  switch (type) {
    case 'taskActivity': {
      const emailData = await getTaskActivityEmailData(activity);
      usersData = emailData.usersData;
      emailContent = emailData.emailContent;

      break;
    }
  }

  if (!usersData?.length) {
    return;
  }

  console.log(`Sending ${usersData.length} emails with type ${type}`);
  await Promise.all(usersData.map(
    async (data) => {
      const emailData = {
        fullName: `${data.firstName} ${data.lastName}`,
        ...emailContent
      };
      await sendgrid.send({
        apiKey: process.env.SENDGRID_API_KEY,
        to: data.email.toLowerCase(),
        from: config.team.emailFrom,
        subject: 'Task update',
        templateId: process.env.SENDGRID_ACTIVITY_TEMPLATE_ID,
        params: emailData,
        unsubscribeGroupId: Number(process.env.SENDGRID_NOTIFICATION_UNSUBSCRIBE_GROUP_ID)
      });
    })
  );
}

/**
 * @param activity
 * @return {Promise<{
 *  usersData: {
 *    email: string,
 *    firstName: string,
 *    lastName:string
 *  }[],
 *  emailContent: * | null
 * }>}
 */
async function getTaskActivityEmailData (activity) {
  const data = activity.data;
  const column = data.column || 'global';
  const allowedColumnsInboxSettingsTypeMap = {
    completedAt: 'emailTaskCompleted',
    messageId: 'emailTaskCommentAdd',
    title: 'emailTaskChange',
    subTitle: 'emailTaskChange',
    additionalInfo: 'emailTaskChange',
    dates: 'emailTaskChange',
    urgentStatus: 'emailTaskChange',
    tag: 'emailTaskChange'
  };
  const inboxSettingType = allowedColumnsInboxSettingsTypeMap[column];

  if (!inboxSettingType) {
    return { usersData: [], emailContent: null };
  }

  const usersPersonalInfo = await UserRepo.getAllUserPersonalDataWithInboxSettingsAndTaskSubscription(
    {
      [inboxSettingType]: true
    },
    activity.taskActivity.taskId,
    activity.creatorId
  );

  if (!usersPersonalInfo.length) {
    return { usersData: [], emailContent: null };
  }

  let relatedUserName = null;

  if (activity.relatedUser) {
    relatedUserName = `${activity.relatedUser.profile.firstName} ${activity.relatedUser.profile.lastName}`;
  }

  const taskData = await TaskRepo.getBookAndTeamById(activity.taskActivity.taskId);
  const url = generateFELink({
    teamLink: taskData.team.link,
    url: `/task-board/${taskData.bookId}?taskId=${taskData.id}`
  });
  const timezone = usersPersonalInfo.timezoneName;
  const date = moment.tz(activity.createdAt, timezone).format('MMM DD Y HH:mm');
  const emailContent = {
    date,
    relatedUserName,
    url,
    type: 'task',
    title: 'Task update',
    data: activity.data,
    creatorName: `${activity.creator.profile.firstName} ${activity.creator.profile.lastName}`
  };
  const usersData = usersPersonalInfo;

  return { usersData, emailContent };
}

module.exports = {
  run
};
