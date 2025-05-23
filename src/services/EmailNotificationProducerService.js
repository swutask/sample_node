const sqs = require('../libs/sqs');
const log = require('../log')('app');
const momentTimezone = require('moment-timezone');
// const UserRepo = require('../repos/UserRepo');
const { emailNotificationType } = require('../core/email-notification-type');
const { required } = require('../utils/index');
const { UserRepo } = require('../repos');

const queueName = process.env.SQS_QUERY_NAME_EMAIL_NOTIFICATION;

class EmailNotificationProducerService {
  /**
   * @param hour {number}
   * @return {string[]}
   */
  static filterTimezoneNamesByHour (hour) {
    const now = momentTimezone();

    return momentTimezone.tz.names().filter(function (tz) {
      const tzNow = now.tz(tz);
      return tzNow.hour() === hour && tzNow.date() === now.date();
    });
  }

  /**
   * @param userId {number}
   * @param operations {string[]}
   * @return {Promise<void>}
   */
  static async sendMessage (userId, operations) {
    await sqs.sendMessage({
      queueName,
      messageBody: 'userId and operations',
      attributes: {
        userId: {
          value: userId
        },
        operations: {
          value: operations,
          makeStringValue: (value) => value.join(',')
        }
      }
    });
    log.info(`Sent user with id=${userId} to queue`);
  }

  /**
   * @param notificationId {number}
   * @param operation {string}
   * @return {Promise<void>}
   */
  static async sendImmediatelyMessage (notificationId = required(), operation = required()) {
    await sqs.sendMessage({
      queueName,
      messageBody: 'userId and operations',
      attributes: {
        notificationId: {
          value: notificationId
        },
        operations: {
          value: operation
        }
      }
    });
    log.info(`Sent notification with id=${notificationId} to queue`);
  }

  /**
   * @param receiveWeeklyPersonalEmailNotifications {boolean}
   * @param receiveDailyTasksNotifications {boolean}
   * @return {string[]}
   */
  static makeOperations ({
    receiveWeeklyPersonalEmailNotifications,
    receiveDailyTasksNotifications
  }) {
    const operations = [];

    if (receiveWeeklyPersonalEmailNotifications) {
      operations.push(emailNotificationType.personalWeekly);
    }

    if (receiveDailyTasksNotifications) {
      operations.push(emailNotificationType.dailyTasks);
    }

    return operations;
  }

  static async run () {
    const timezoneNames = this.filterTimezoneNamesByHour(6);
    const users = await UserRepo.findAllByTimezoneNamesWithInbox(timezoneNames);

    for (const user of users) {
      const {
        receiveDailyTasksNotifications
      } = user.inbox;

      const operations = this.makeOperations({
        receiveDailyTasksNotifications
      });

      if (!operations.length) {
        continue;
      }

      await this.sendMessage(user.id, operations);
    }
  }
}

module.exports = EmailNotificationProducerService;
