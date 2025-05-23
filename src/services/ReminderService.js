'use strict';
const { required } = require('../utils/index.js');
const ReminderRepo = require('../repos/ReminderRepo.js');

class ReminderService {
  /**
   * @param taskId {number}
   * @param userId {number}
   * @param date {string}
   * @returns {Promise<*>}
   */
  static createReminder ({
    userId = required(),
    taskId = required(),
    date = required()
  } = {}) {
    return ReminderRepo.createReminder({
      userId,
      taskId,
      date
    });
  }

  /**
   * @param userId {number}
   * @param id {number}
   * @param date {string}
   * @returns {Promise<*>}
   */
  static async updateReminder ({
    userId = required(),
    id = required(),
    date = required(),
    taskId = required()
  } = {}) {
    return ReminderRepo.updateReminder({
      userId,
      id,
      date,
      taskId
    });
  }

  /**
   * @param userId {number}
   * @param id {number}
   * @returns {Promise<*>}
   */
  static async deleteReminder ({
    userId = required(),
    id = required()
  } = {}) {
    return ReminderRepo.deleteReminder({
      userId,
      id
    });
  }

  /**
   * @param userId {number}
   * @returns {Promise<*>}
   */
  static async getReminderSettings (userId = required()) {
    return ReminderRepo.getReminderSettings(userId);
  }

  /**
   * @param userId {number}
   * @param allowSendToEmail {boolean}
   * @param allowSendToPush {boolean}
   * @returns {Promise<*>}
   */
  static async updateReminderSettings ({
    userId = required(),
    allowSendToEmail,
    allowSendToPush
  } = {}) {
    return ReminderRepo.updateReminderSettings({
      userId,
      allowSendToEmail,
      allowSendToPush
    });
  }
}

module.exports = ReminderService;
