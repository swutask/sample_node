'use strict';

const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} = require('@aws-sdk/client-sqs');
const { required } = require('../utils');

let clientConfiguration = {
  region: process.env.SQS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET
  }
};

if (process.env.NODE_ENV === 'development') {
  clientConfiguration = {
    region: process.env.SQS_REGION,
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET
    }
  };
}

const client = new SQSClient(clientConfiguration);

function makeSqsAttributes (attributes) {
  return Object.entries(attributes).reduce(
    (accumulator, [name, {
      value,
      makeStringValue
    }]) => {
      const dataType = typeof value === 'number' ? 'Number' : 'String';
      const stringValue = makeStringValue ? makeStringValue(value) : value.toString();

      accumulator[name] = {
        DataType: dataType,
        StringValue: stringValue
      };

      return accumulator;
    },
    {}
  );
}

/**
 * @param queryName {string}
 * @return {string}
 */
function makeQueryUrl (queryName) {
  let sqsUrl = process.env.SQS_URL;

  if (sqsUrl.slice(-1) !== '/') {
    sqsUrl += '/';
  }

  return sqsUrl + queryName;
}

function parseBody (str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return str;
  }
}

module.exports = {
  /**
   @param attributes {{
    [p: string]: {
         value: any,
         makeStringValue?: (value: any) => string
      }
   }}
   @param messageBody {string}
   @param queueName {string}
   @return Promise<string>
   */
  sendMessage: async ({
    attributes = required(),
    messageBody = required(),
    queueName = required()
  }) => {
    const messageAttributes = makeSqsAttributes(attributes);
    const command = new SendMessageCommand({
      QueueUrl: makeQueryUrl(queueName),
      MessageAttributes: messageAttributes,
      MessageBody: messageBody
    });

    const { MessageId: messageId } = await client.send(command);

    return messageId;
  },

  /**
   * @param visibilityTimeoutInSeconds {number}
   * @param queueName {string}
   * @return {Promise<Array<{
   *   handler: string,
   *   attributes: Object
   * }>>}
   */
  receiveMessage: async ({
    visibilityTimeoutInSeconds = required(),
    queueName = required()
  }) => {
    const command = new ReceiveMessageCommand({
      QueueUrl: makeQueryUrl(queueName),
      VisibilityTimeout: visibilityTimeoutInSeconds,
      MessageAttributeNames: ['All']
    });
    const { Messages: messages } = await client.send(command);

    if (!messages) {
      return [];
    }

    return messages.map((message) => {
      const {
        MessageAttributes: attributes,
        ReceiptHandle: handler,
        Body: body
      } = message;
      let attributeEntries = [];

      if (attributes) {
        attributeEntries = Object.entries(attributes).map(([key, attributeValue]) => [
          key,
          attributeValue.StringValue
        ]);
      }

      return {
        handler,
        attributes: Object.fromEntries(attributeEntries),
        body: parseBody(body)
      };
    });
  },

  /**
   * @param receiptHandle {string}
   * @param queueName {string}
   * @return {Promise<void>}
   */
  deleteMessage: async ({
    receiptHandle = required(),
    queueName = required()
  }) => {
    const command = new DeleteMessageCommand({
      QueueUrl: makeQueryUrl(queueName),
      ReceiptHandle: receiptHandle
    });

    await client.send(command);
  }
};
