const sqs = require('../libs/sqs');
const log = require('../log')('app');
const ActivityRepo = require('../repos/ActivityRepo');
const oneSignal = require('../libs/oneSignal');
const TaskSubscriptionRepo = require('../repos/TaskSubscriptionRepo');
const TaskRepo = require('../repos/TaskRepo');
const { generateFELink, removeHtmlTagsFromString } = require('../utils');

const queueName = process.env.SQS_QUERY_NAME_PUSH_ACTIVITY;

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
 *  activityId: number
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

  /**
   * @type {{
   *   url: string,
   *   message: string,
   *   userIds: number[]
   * }}
   */
  let pushData = {};

  switch (type) {
    case 'taskActivity': {
      pushData = await getTaskActivityPushData(activity);

      break;
    }
  }

  await Promise.all(
    pushData.userIds.map(
      async (userId) => {
        await oneSignal.sendMessage({
          content: pushData.message,
          name: 'push_activity',
          userId: userId,
          url: pushData.url
        });
        console.log(`Handler ${type}`);
      }
    )
  );
}

/**
 * @param activity
 * @return {Promise<{
 *   url: string,
 *   message: string,
 *   userIds: number[]
 * }>}
 */
async function getTaskActivityPushData (activity) {
  const data = activity.data;
  const column = data.column || 'global';
  const allowedColumnsInboxSettingsTypeMap = {
    completedAt: 'pushTaskCompleted',
    messageId: 'pushTaskCommentAdd',
    title: 'pushTaskChange',
    subTitle: 'pushTaskChange',
    additionalInfo: 'pushTaskChange',
    dates: 'pushTaskChange',
    urgentStatus: 'pushTaskChange',
    tag: 'pushTaskChange'
  };
  const inboxSettingType = allowedColumnsInboxSettingsTypeMap[column];

  if (!inboxSettingType) {
    return { message: '', url: '', userIds: [] };
  }

  const task = await TaskRepo.getByIdWithTeam(activity.taskActivity.taskId);

  if (!task) {
    return { message: '', url: '', userIds: [] };
  }

  const userIds = await TaskSubscriptionRepo.getAllUserIdsByTaskId(activity.taskActivity.taskId);

  if (!userIds.length) {
    return { message: '', url: '', userIds: [] };
  }

  const creatorFullName = `${activity.creator.profile.firstName} ${activity.creator.profile.lastName}`;
  let message = `${creatorFullName} `;
  const taskName = removeHtmlTagsFromString(task.title);

  switch (column) {
    case ('completedAt') : {
      if (data.action === 'create') {
        message += 'completed this task';
      } else if (data.action === 'delete') {
        message += 're-opened this task';
      }

      break;
    }

    case ('messageId'): {
      message += 'added a comment to the task';

      break;
    }

    case ('title'):
    case ('subTitle'):
    case ('additionalInfo'):
    case ('dates'):
    case ('tag'): {
      message += 'updated an attribute of the task';

      break;
    }

    case ('urgentStatus'): {
      if (data.action === 'delete') {
        message += 'removed the priority from the task';

        break;
      }

      const priority = data.value;
      const priorityNameMap = {
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Urgent'
      };

      message += `changed the priority to "${priorityNameMap[priority]}" for the task`;

      break;
    }

    default: {
      message += 'updated the task';
    }
  }

  message += ` "${taskName}"`;
  const url = generateFELink({
    teamLink: task.team.link,
    url: `/task-board/${task.bookId}?taskId=${task.id}`
  });

  return {
    message,
    url,
    userIds: userIds.filter((userId) => userId !== activity.creatorId)
  };
}

module.exports = {
  run
};
