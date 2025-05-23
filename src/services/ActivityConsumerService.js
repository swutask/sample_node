const sqs = require('../libs/sqs');
const log = require('../log')('app');
const { required, removeHtmlTagsFromObject } = require('../utils');
const ActivityRepo = require('../repos/ActivityRepo');
const TaskActivityRepo = require('../repos/TaskActivityRepo');
const BookActivityRepo = require('../repos/BookActivityRepo');
const InboxActivityRepo = require('../repos/InboxActivityRepo');
const { sequelize } = require('../loaders/sequelize');
const SocketNotifyService = require('./SocketNotifyService');
const { UserRepo } = require('../repos/index');
const TaskRepo = require('../repos/TaskRepo');
const ProjectRepo = require('../repos/ProjectRepo');
const InboxRepo = require('../repos/InboxRepo');
const MessageRepo = require('../repos/MessageRepo');
const ChatRepo = require('../repos/ChatRepo');
const AttachmentRepo = require('../repos/AttachmentRepo');
const BookRepo = require('../repos/BookRepo');
const AnnotationRepo = require('../repos/AnnotationRepo');
const TaskRowRepo = require('../repos/TaskRowRepo');
const TaskSubscriptionRepo = require('../repos/TaskSubscriptionRepo');
const EmailActivityProducerService = require('../services/EmailActivityProducerService');
const PushActivityProducerService = require('../services/PushActivityProducerService');
const ReminderRepo = require('../repos/ReminderRepo');

const queueName = process.env.SQS_QUERY_NAME_ACTIVITY;

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
    const {
      from,
      to,
      creatorId,
      type,
      createdAt,
      entity
    } = parseAttributes(message.attributes);

    const entityHandlerMap = {
      task: taskHandler,
      subTask: subTaskHandler,
      project: projectHandler,
      chatMessage: chatMessageHandler,
      attachment: attachmentHandler,
      book: bookHandler,
      annotation: annotationHandler,
      reminder: reminderHandler
    };

    await entityHandlerMap[entity]({
      from,
      to,
      creatorId,
      type,
      createdAt
    });

    console.log(`Handled entity:${entity} for type:${type}`);
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
 *  from: Object | null,
 *  to: Object | null,
 *  creatorId: number,
 *  type: string,
 *  createdAt: Date,
 *  entity: string,
 *  entityId: number
 * }}
 */
function parseAttributes (attributes = required()) {
  return {
    from: JSON.parse(attributes.from),
    to: JSON.parse(attributes.to),
    creatorId: parseInt(attributes.creatorId),
    type: attributes.type,
    createdAt: new Date(attributes.createdAt),
    entity: attributes.entity
  };
}

/**
 * @param from {Object}
 * @param to {Object}
 * @param options{{
 *  ignoreKeys: string[] | undefined,
 *  actionRequireValueKeysMap: Record<'create' | 'update' | 'delete', string[]> | undefined,
 *  requireAdditionUpdateValueKeys: string[] | undefined,
 *  customValue: *
 * }}
 * @return {Record<string, ?>[]}
 */
function compareModelsChanges (from, to, options = {}) {
  if (from == null || to == null) {
    return [];
  }

  return Object.entries(to).reduce((acc, [key, value]) => {
    if (options.ignoreKeys?.includes(key) || from[key] instanceof Array) {
      return acc;
    }

    if (from[key] instanceof Object) {
      acc.push(compareModelsChanges(from[key], value));

      return acc;
    }

    let change = null;

    if (!from[key] && value) {
      const action = 'create';
      change = {
        column: key,
        action
      };

      if (options.customValue) {
        change.customValue = options.customValue;
      }

      if (options.actionRequireValueKeysMap?.create?.includes(key)) {
        change.value = value;
      }

      acc.push(change);

      return acc;
    }

    if (!value && from[key]) {
      const action = 'delete';
      change = {
        column: key,
        action
      };

      if (options.customValue) {
        change.customValue = options.customValue;
      }

      if (options.actionRequireValueKeysMap?.delete?.includes(key)) {
        change.value = from[key];
      }

      acc.push(change);

      return acc;
    }

    if (from[key] !== value) {
      const action = 'update';
      change = {
        column: key,
        action
      };

      if (options.customValue) {
        change.customValue = options.customValue;
      }

      if (options.actionRequireValueKeysMap?.update?.includes(key)) {
        change.value = value;
      }

      if (options.requireAdditionUpdateValueKeys?.includes(key)) {
        change.additionValue = from[key];
      }

      acc.push(change);

      return acc;
    }

    return acc;
  }, []);
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function subTaskHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const subTaskId = to?.id || from?.id;

  if (!subTaskId) {
    throw new Error('Sub task id is required');
  }

  let subTask = await TaskRepo.getById(subTaskId);

  if (!subTask) {
    if (to !== null) {
      throw new Error('Sub task does not exists');
    } else {
      subTask = {
        title: from?.title,
        parentId: from?.parentId
      };
    }
  }

  if (!subTask.parentId) {
    throw new Error('Task is not a sub task');
  }

  let changes;

  if (from === null && to?.id) {
    changes = [{
      column: null,
      action: 'subTask-create',
      customValue: subTask.title
    }];
  } else if (to === null && from?.id) {
    changes = [{
      column: null,
      action: 'subTask-delete',
      customValue: subTask.title
    }];
  } else {
    changes = compareModelsChanges(from, to, {
      ignoreKeys: [
        'id',
        'parentId'
      ],
      actionRequireValueKeysMap: {
        update: [
          'title',
          'completedAt'
        ]
      },
      customValue: subTask.title
    });
  }

  if (!changes.length) {
    return;
  }

  await createTaskActivities({
    taskId: subTask.parentId,
    changes,
    creatorId,
    type,
    createdAt,
    isSubtask: true
  });
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function taskHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const taskId = to?.id || from?.id;

  if (!taskId) {
    throw new Error('Task id is required');
  }

  let changes;

  if (from === null && to?.relatedUserId) {
    changes = [{
      column: 'relatedUserId',
      action: 'create',
      value: to.relatedUserId
    }];
  } else if (to === null && from?.relatedUserId) {
    changes = [{
      column: 'relatedUserId',
      action: 'delete',
      value: from.relatedUserId
    }];
  } else if (from === null && to?.id) {
    changes = [{
      column: null,
      action: 'task-create'
    }];
  } else {
    changes = compareModelsChanges(from, to, {
      ignoreKeys: [
        'id',
        'endDate',
        'startDate',
        'taskRowId',
        'tagName',
        'tagColor'
      ],
      actionRequireValueKeysMap: {
        create: [
          'urgentStatus',
          'messageId'
        ],
        update: [
          'urgentStatus',
          'title',
          'endDate'
        ],
        delete: [
          'urgentStatus'
        ]
      },
      requireAdditionUpdateValueKeys: [
        'urgentStatus'
      ]
    });
  }

  if (from?.tagName || to?.tagName || from?.tagColor || to?.tagColor) {
    if (
      (from?.tagName === null || from?.tagColor === null) &&
      (to?.tagName || to?.tagColor)
    ) {
      changes.push({
        column: 'tag',
        action: 'create',
        value: {
          name: to?.tagName || null,
          color: to?.tagColor || null
        }
      });
    } else {
      changes.push({
        column: 'tag',
        action: 'delete',
        customValue: {
          name: from?.tagName || null,
          color: from?.tagColor || null
        }
      });
    }
  }

  if (from?.taskRowId && to?.taskRowId && from?.taskRowId !== to?.taskRowId) {
    const taskRows = await TaskRowRepo.getAllByIds([
      from?.taskRowId,
      to?.taskRowId
    ]);

    if (taskRows.length === 2) {
      const { fromRowTitle, toRowTitle } = taskRows.reduce((acc, taskRow) => {
        if (taskRow.id === from?.taskRowId) {
          acc.fromRowTitle = taskRow.title;

          return acc;
        }

        acc.toRowTitle = taskRow.title;

        return acc;
      }, {});

      changes.push({
        column: 'taskRowName',
        value: toRowTitle,
        additionValue: fromRowTitle,
        action: 'update'
      });
    }
  }

  if (
    (from?.startDate && from?.endDate) ||
    (to?.startDate && to?.endDate)
  ) {
    if (to?.endDate && to?.startDate && (from?.endDate === null && from?.startDate === null)) {
      changes.push({
        column: 'dates',
        value: {
          startDate: to?.startDate,
          endDate: to?.endDate
        },
        action: 'create'
      });
    } else if (from?.endDate && from?.startDate && (to?.endDate === null && to?.startDate === null)) {
      changes.push({
        column: 'dates',
        value: {
          startDate: null,
          endDate: null
        },
        additionValue: {
          startDate: from?.startDate,
          endDate: from?.endDate
        },
        action: 'delete'
      });
    } else if (to?.endDate !== from?.endDate || to?.startDate !== from?.startDate) {
      changes.push({
        column: 'dates',
        value: {
          startDate: to?.startDate,
          endDate: to?.endDate
        },
        action: 'update'
      });
    }
  }

  if (!changes.length) {
    return;
  }

  await createTaskActivities({
    taskId,
    changes,
    creatorId,
    type,
    createdAt
  });
}

async function createTaskActivities ({
  taskId,
  changes,
  creatorId,
  type,
  createdAt,
  isSubtask = false
}) {
  const task = await TaskRepo.getBookAndTeamIdById(taskId);

  if (!task) {
    throw new Error('Task does not exists');
  }

  const userIdsWithSubscription = await TaskSubscriptionRepo.getAllUserIdsByTaskId(task.id);
  let inboxes = [];

  if (userIdsWithSubscription.length) {
    inboxes = await InboxRepo.getAllByUserIds(userIdsWithSubscription);
  }

  const activityIds = await sequelize.transaction(async (transaction) => {
    const createActivityData = changes.map((change) => ({
      data: {
        ...removeHtmlTagsFromObject(change),
        isSubtask,
        bookId: task.bookId
      },
      creatorId,
      relatedUserId: change.column === 'relatedUser'
        ? change.value
        : null,
      type,
      createdAt
    }));
    const createdActivityIds = await ActivityRepo.bulkCreateReturnIds(createActivityData, {
      transaction
    });
    const createTaskActivityData = createdActivityIds.map((activityId) => ({
      activityId,
      taskId: task.id,
      teamId: task.teamId,
      createdAt
    }));
    const createTaskActivityIds = await TaskActivityRepo.bulkCreateReturnIds(createTaskActivityData, {
      transaction
    });

    if (createdActivityIds.length !== createTaskActivityIds.length) {
      throw new Error('Wrong ids count');
    }

    await createInboxActivities({
      inboxes,
      creatorId,
      activityIds: createdActivityIds,
      teamId: task.teamId,
      createdAt,
      transaction,
      type: 'private',
      taskId
    });

    return createdActivityIds;
  });

  const uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(task.teamId, task.bookId);

  if (!uniqueUserIds) {
    return;
  }

  const activities = await ActivityRepo.getAllByIds(activityIds);
  activities.forEach((activity) => {
    for (const uniqueUserId of uniqueUserIds) {
      SocketNotifyService.notify({
        userId: uniqueUserId,
        name: 'taskActivity',
        payload: {
          type: 'addTaskActivity',
          taskId: task.id,
          activity
        }
      });
    }

    for (const { id, userId } of inboxes) {
      if (userId === creatorId) {
        continue;
      }

      SocketNotifyService.notify({
        userId: userId,
        name: 'inboxActivity',
        payload: {
          type: 'addInboxActivity',
          inboxId: id,
          inboxType: 'private',
          activity
        }
      });
    }
  });

  const pushColumns = [
    'completedAt',
    'messageId',
    'title',
    'subTitle',
    'additionalInfo',
    'dates',
    'urgentStatus',
    'tag'
  ];
  const emailColumns = [
    'completedAt',
    'messageId',
    'title',
    'subTitle',
    'additionalInfo',
    'dates',
    'urgentStatus',
    'tag',
    'taskRowName'
  ];
  await Promise.all(activities.map(async (activity) => {
    if (isSubtask) {
      return;
    }

    if (pushColumns.includes(activity.data.column)) {
      await PushActivityProducerService.sendMessage({ activityId: activity.id });
    }

    if (emailColumns.includes(activity.data.column)) {
      await EmailActivityProducerService.sendMessage({ activityId: activity.id });
    }
  }));
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function projectHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const projectId = to?.id || from?.id;

  if (!projectId) {
    throw new Error('Project id is required');
  }

  const project = await ProjectRepo.getByIdiWthBook(projectId);

  if (!project && to !== null) {
    throw new Error('Project not found');
  }

  let changes;

  if (from === null && to?.id) {
    changes = [{
      column: null,
      action: 'project-create',
      customValue: project.title
    }];
  } else if (to === null && from?.id) {
    changes = [{
      column: null,
      action: 'project-delete',
      customValue: from?.title
    }];
  } else {
    changes = compareModelsChanges(from, to, {
      ignoreKeys: [
        'id'
      ],
      actionRequireValueKeysMap: {
        update: [
          'title'
        ]
      },
      requireAdditionUpdateValueKeys: [
        'title'
      ],
      customValue: project.title
    });
  }

  if (!changes.length) {
    return;
  }

  await createBookAndInboxActivities({
    teamId: from?.teamId || project.book.teamId,
    bookId: from?.bookId || project.bookId,
    changes,
    creatorId,
    type,
    createdAt,
    entityProperty: {
      projectId: projectId
    }
  });
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function chatMessageHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const chatMessageId = to?.id || from?.id;

  if (!chatMessageId) {
    throw new Error('Message id is required');
  }

  const chatMessage = await MessageRepo.getById(chatMessageId);

  if (!chatMessage) {
    throw new Error('Message not found');
  }

  const chat = await ChatRepo.getByIdWithRelated(chatMessage.chatId);
  let changes;

  if (from === null && to?.id && chat.attachmentId && chatMessage.threadId) {
    changes = [{
      column: 'threadId',
      value: chatMessage.threadId,
      action: 'create',
      customValue: chat.attachment.name
    }];
  } else {
    changes = compareModelsChanges(from, to, {
      ignoreKeys: [
        'id',
        'threadId'
      ]
    });
  }

  await createBookAndInboxActivities({
    teamId: chat.teamId ??
      chat.attachment?.teamId ??
      chat.book?.teamId,
    bookId: chat.bookId ??
      chat.attachment?.bookId ??
    changes,
    creatorId,
    createdAt,
    type,
    entityProperty: {
      chatId: chat.id,
      messageId: chatMessageId,
      attachmentId: chat.attachmentId,
      taskId: chat.taskId
    }
  });
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function attachmentHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const attachmentId = to?.id;

  if (!attachmentId) {
    throw new Error('Attachment id is required');
  }

  const attachment = await AttachmentRepo.getById(attachmentId);

  if (!attachment) {
    throw new Error('Attachment not found');
  }

  const entityProperty = {
    attachmentId: attachment.id
  };

  let changes = [];

  if (from === null && to?.id && !to?.originalId) {
    changes = [{
      // TODO add type
      column: 'name',
      value: attachment.name
    }];
  } else if (from === null && to?.originalId) {
    const originalAttachment = await AttachmentRepo.getById(to?.originalId);
    entityProperty.originalAttachmentId = to?.originalId;

    changes = [{
      column: 'version',
      value: attachment.version,
      customValue: originalAttachment.name
    }];
  }

  changes.push(
    ...compareModelsChanges(from, to, {
      ignoreKeys: [
        'id',
        'originalId'
      ],
      actionRequireValueKeysMap: {
        update: ['status'],
        create: ['status']
      },
      customValue: attachment.name
    })
  );

  await createBookAndInboxActivities({
    teamId: attachment.teamId,
    bookId: attachment.bookId,
    changes,
    creatorId,
    createdAt,
    type,
    entityProperty
  });
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function reminderHandler ({
  from,
  to,
  type,
  creatorId,
  createdAt
}) {
  const reminderId = to?.id || from?.id;

  if (!reminderId) {
    throw new Error('Reminder id is required');
  }

  const reminder = await ReminderRepo.getReminderById(reminderId);

  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const inboxes = await InboxRepo.getAllByUserIds([reminder.userId]);

  const createActivityData = [{
    data: {
      reminderId: reminder.id,
      remindAt: reminder.remindAt,
      taskTitle: reminder.task.title,
      taskId: reminder.taskId,
      taskParentId: reminder.task.parentId,
      column: 'remindAt'
    },
    creatorId,
    type,
    createdAt
  }];

  const createdActivityIds = await ActivityRepo.bulkCreateReturnIds(createActivityData);

  const createInboxActivityData = [
    {
      activityId: createdActivityIds[0],
      inboxId: inboxes[0].id,
      teamId: reminder.task.teamId,
      type: 'private',
      createdAt,
      taskId: reminder.taskId
    }
  ];

  await InboxActivityRepo.bulkCreateReturnIds(createInboxActivityData);

  const activities = await ActivityRepo.getAllByIds(createdActivityIds);

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

  return createdActivityIds;
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function annotationHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const annotationId = to?.id || from?.id;

  if (!annotationId) {
    throw new Error('Annotation id is required');
  }

  const annotation = await AnnotationRepo.getByIdWithAttachment(annotationId);

  if (!annotation) {
    throw new Error('Annotation not found');
  }

  if (!annotation.attachment.bookId) {
    throw new Error('No book connection');
  }

  let changes;

  if (from === null && to?.id) {
    changes = [{
      column: null,
      action: 'annotation-create',
      customValue: annotation.attachment.name
    }];
  } else if (to === null && from?.id) {
    changes = [{
      column: null,
      action: 'annotation-delete',
      customValue: annotation.attachment.name
    }];
  } else {
    changes = compareModelsChanges(from, to, {
      ignoreKeys: [
        'id'
      ],
      customValue: annotation.attachment.name
    });
  }

  if (!changes.length) {
    return;
  }

  await createBookAndInboxActivities({
    teamId: annotation.teamId,
    bookId: annotation.attachment.bookId,
    changes,
    creatorId,
    type,
    createdAt,
    entityProperty: {
      annotationId,
      messageId: annotation.messageId,
      attachmentId: annotation.attachmentId
    }
  });
}

/**
 * @param from {Object | null}
 * @param to {Object | null}
 * @param creatorId {number}
 * @param type {string}
 * @param createdAt {Date}
 * @return {Promise<void>}
 */
async function bookHandler ({
  from,
  to,
  creatorId,
  type,
  createdAt
}) {
  const bookId = to?.id;

  if (!bookId) {
    throw new Error('Book id is required');
  }

  const book = await BookRepo.getById(bookId);

  if (!book) {
    throw new Error('Book not found');
  }

  const changes = compareModelsChanges(from, to, {
    ignoreKeys: [
      'id',
      'activeToolId',
      'startDate',
      'endDate'
    ],
    actionRequireValueKeysMap: {
      create: ['relatedUserId'],
      delete: ['relatedUserId']
    },
    customValue: book.title
  });

  if (
    (from?.startDate && !to?.startDate) &&
    (from?.endDate && !to?.endDate)
  ) {
    changes.push({
      column: 'dates',
      action: 'delete'
    });
  } else if (
    (!from?.startDate && to?.startDate) &&
    (!from?.endDate && to?.endDate)
  ) {
    changes.push({
      column: 'dates',
      action: 'create'
    });
  } else if (
    from?.startDate !== to?.startDate ||
    from?.endDate !== to?.endDate
  ) {
    changes.push({
      column: 'dates',
      action: 'update'
    });
  }

  await createBookAndInboxActivities({
    teamId: book.teamId,
    bookId,
    changes,
    creatorId,
    type,
    createdAt
  });
}

async function createBookAndInboxActivities ({
  teamId,
  bookId,
  changes,
  creatorId,
  type,
  createdAt,
  entityProperty
}) {
  const uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId, bookId);
  let inboxes = [];

  if (uniqueUserIds) {
    inboxes = await InboxRepo.getAllByUserIds(uniqueUserIds);
  }

  const activityIds = await sequelize.transaction(async (transaction) => {
    const createActivityData = changes.map((change) => ({
      data: {
        ...removeHtmlTagsFromObject(change),
        ...entityProperty,
        bookId
      },
      creatorId,
      type,
      createdAt,
      relatedUserId: change.column === 'relatedUserId'
        ? change.value
        : null
    }));
    const createdActivityIds = await ActivityRepo.bulkCreateReturnIds(createActivityData, {
      transaction
    });

    if (bookId) {
      const createBookActivityData = createdActivityIds.map((activityId) => ({
        activityId,
        bookId: bookId,
        teamId: teamId,
        createdAt
      }));
      const createBookActivityIds = await BookActivityRepo.bulkCreateReturnIds(createBookActivityData, {
        transaction
      });

      if (createdActivityIds.length !== createBookActivityIds.length) {
        throw new Error('Wrong ids count');
      }
    }

    await createInboxActivities({
      inboxes,
      creatorId,
      activityIds: createdActivityIds,
      teamId,
      createdAt,
      transaction
    });

    return createdActivityIds;
  });

  if (!uniqueUserIds) {
    return;
  }

  const activities = await ActivityRepo.getAllByIds(activityIds);
  activities.forEach((activity) => {
    if (bookId) {
      for (const uniqueUserId of uniqueUserIds) {
        SocketNotifyService.notify({
          userId: uniqueUserId,
          name: 'bookActivity',
          payload: {
            type: 'addBookActivity',
            activity,
            ...entityProperty
          }
        });
      }
    }

    for (const { id, userId } of inboxes) {
      SocketNotifyService.notify({
        userId: userId,
        name: 'inboxActivity',
        payload: {
          type: 'addInboxActivity',
          inboxId: id,
          activity,
          inboxType: 'public',
          ...entityProperty
        }
      });
    }
  });
}

/**
 * @param inboxes {*[]}
 * @param creatorId {number}
 * @param activityIds {number[]}
 * @param teamId {number}
 * @param createdAt {Date}
 * @param transaction {import('sequelize').Transaction}
 * @param type {'private' | 'public'}
 * @param taskId {number | undefined}
 * @returns {Promise<void>}
 */
async function createInboxActivities ({
  inboxes,
  creatorId,
  activityIds,
  teamId,
  createdAt,
  transaction,
  type = 'public',
  taskId
}) {
  if (!inboxes.length) {
    return;
  }

  const createInboxActivityData = [];

  activityIds.forEach(
    (createdActivityId) => inboxes.forEach(
      (inbox) => {
        if (inbox.userId === creatorId) {
          return;
        }

        createInboxActivityData.push({
          activityId: createdActivityId,
          inboxId: inbox.id,
          teamId: teamId,
          type,
          createdAt,
          taskId
        });
      }
    )
  );

  await InboxActivityRepo.bulkCreateReturnIds(createInboxActivityData, {
    transaction
  });
}

module.exports = {
  run
};
