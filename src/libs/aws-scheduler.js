'use strict';

const AWS = require('aws-sdk');
const { required } = require('../utils');

const clientConfiguration = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET
  }
};

// if (process.env.NODE_ENV === 'development') {
//   clientConfiguration = {
//     region: process.env.AWS_REGION,
//     endpoint: 'http://localhost:4566',
//     credentials: {
//       accessKeyId: process.env.AWS_KEY,
//       secretAccessKey: process.env.AWS_SECRET
//     }
//   };
// }

const scheduler = new AWS.Scheduler(clientConfiguration);

module.exports = {
  /**
    * @param reminder {{
      *   id: number
      *   userId: number
      *   startDate: date
      *   endDate: date
    * }}
    * @param timezoneName {string}
    * @returns {Promise<*>}
  */
  scheduleReminder: async ({
    reminder = required(),
    timezoneName = required()
  } = {}) => {
    const target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN,
      Arn: process.env.REMINDER_TARGET_ARN,
      Input: JSON.stringify(reminder)
    };

    const schedulerInput = {
      Name: `${reminder.id}`,
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      // ActionAfterCompletion: 'DELETE',
      Target: target,
      StartDate: reminder.startDate,
      EndDate: reminder.endDate,
      ScheduleExpression: 'rate(10 minutes)',
      ScheduleExpressionTimezone: timezoneName,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME,
      ClientToken: `${reminder.userId}`
    };

    const result = await scheduler.createSchedule(schedulerInput).promise();

    return result;
  },

  /**
    * @param reminder {{
      *   id: number
      *   userId: number
      *   startDate: date
      *   endDate: date
    * }}
    * @returns {Promise<*>}
  */
  updateReminder: async ({
    reminder = required(),
    timezoneName = required()
  } = {}) => {
    const target = {
      RoleArn: process.env.REMINDER_TARGET_ROLE_ARN,
      Arn: process.env.REMINDER_TARGET_ARN,
      Input: JSON.stringify(reminder)
    };

    const schedulerInput = {
      Name: `${reminder.id}`,
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      // ActionAfterCompletion: 'DELETE',
      Target: target,
      StartDate: reminder.startDate,
      EndDate: reminder.endDate,
      ScheduleExpression: 'rate(10 minutes)',
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME,
      ScheduleExpressionTimezone: timezoneName,
      ClientToken: `${reminder.userId}`
    };

    const result = await scheduler.updateSchedule(schedulerInput).promise();

    return result;
  },

  /**
    * @param id: number,
    * @param clientToken: number as userId,
    * @returns {Promise<*>}
  */
  deleteReminder: async ({
    id = required(),
    clientToken = required()
  } = {}) => {
    const schedulerInput = {
      Name: `${id}`,
      GroupName: process.env.REMINDER_SCHEDULER_GROUP_NAME,
      ClientToken: `${clientToken}`
    };

    const result = await scheduler.deleteSchedule(schedulerInput).promise();

    return result;
  }
};
