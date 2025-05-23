const sqs = require('../libs/sqs');
const queueName = process.env.SQS_QUERY_NAME_PUSH_ACTIVITY;

/**
 * @param activityId {number}
 * @return {Promise<void>}
 */
async function sendMessage ({
  activityId
}) {
  await sqs.sendMessage({
    queueName,
    messageBody: 'push activity data',
    attributes: {
      activityId: {
        value: activityId
      }
    }
  });
}

module.exports = {
  sendMessage
};
