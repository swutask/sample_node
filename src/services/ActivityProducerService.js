const sqs = require('../libs/sqs');
const queueName = process.env.SQS_QUERY_NAME_ACTIVITY;

const entityAllowKeysMap = {
  task: [
    // task model
    'id',
    'title',
    'subTitle',
    // TODO revert after tiptap update
    // 'additionalInfo',
    'urgentStatus',
    'completedAt',
    'startDate',
    'endDate',
    'taskRowId',
    // tag model
    'tagName',
    'tagColor',
    // taskToMember model
    'relatedUserId',
    // message model
    'messageId',
    // attachment model,
    'attachmentCoverImageId'
  ],
  subTask: [
    'id',
    'parentId',
    'title',
    'completedAt'
  ],
  project: [
    'id',
    'title',
    // TODO revert after tiptap update
    // 'body',
    'icon',
    'teamId',
    'bookId'
  ],
  chatMessage: [
    'id',
    'resolvedAt'
  ],
  attachment: [
    'id',
    'originalId',
    'status'
  ],
  book: [
    'id',
    'title',
    'subTitle',
    'startDate',
    'endDate',
    // client model
    'clientId',
    // bookLink model
    'bookLinkId',
    // user model,
    'relatedUserId',
    // filter model
    'defaultFilter'
  ],
  annotation: [
    'id',
    'x',
    'y',
    'text',
    'resolvedAt'
  ],
  reminder: [
    'id'
  ]
};

/**
 * @param allowKeys {string[]}
 * @return {function(Object): string}
 */
function makeStringValueFromEntity (allowKeys) {
  return (obj) => {
    return JSON.stringify(obj, allowKeys);
  };
}

/**
 * @param from {Object}
 * @param to {Object}
 * @param type {string}
 * @param createdAt {Date}
 * @param entity {string}
 * @param creatorId {number}
 * @return {Promise<void>}
 */
async function sendMessage ({
  from,
  to,
  type,
  createdAt = new Date(),
  entity,
  creatorId
}) {
  await sqs.sendMessage({
    queueName,
    messageBody: 'activity data',
    attributes: {
      from: {
        value: from,
        makeStringValue: makeStringValueFromEntity(entityAllowKeysMap[entity] || null)
      },
      to: {
        value: to,
        makeStringValue: makeStringValueFromEntity(entityAllowKeysMap[entity] || null)
      },
      createdAt: {
        value: createdAt,
        makeStringValue: (value) => value.toISOString()
      },
      type: {
        value: type
      },
      entity: {
        value: entity
      },
      creatorId: {
        value: creatorId
      }
    }
  });
}

module.exports = {
  sendMessage
};
