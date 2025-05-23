const moment = require('moment');

const { required } = require('../utils');
const models = require('../models');
const { awsScheduler } = require('../libs');
const UserRepo = require('./UserRepo');
const log = require('../log')('reminder-repo');

class ReminderRepo {
  /**
   * @param id {number}
   * @returns {Promise<*>}
   */
  static async getReminderById (id = required()) {
    const reminder = await models.reminder.findByPk(id, {
      include: [
        {
          model: models.user,
          attributes: ['id', 'email'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color', 'timezoneName']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        },
        {
          model: models.task,
          required: true,
          attributes: ['id', 'title', 'bookId', 'parentId', 'teamId'],
          include: [
            {
              model: models.teamMember,
              attributes: ['id'],
              include: {
                model: models.user,
                attributes: ['id'],
                include: [{
                  model: models.profile,
                  attributes: ['firstName', 'lastName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }]
              }
            },
            {
              model: models.book,
              attributes: ['id', 'icon']
            }
          ]
        }
      ]
    });

    if (!reminder) {
      return null;
    }

    return reminder.get();
  }

  static async checkIfAllowedSendReminderToEmail (userId) {
    const reminderSetting = await this.getReminderSettings(userId);

    return reminderSetting.allowSendToEmail;
  }

  static async checkIfAllowedSendPushReminder (userId) {
    const reminderSetting = await this.getReminderSettings(userId);

    return reminderSetting.allowSendToPush;
  }

  static _checkIFDateMoreThanNow (date) {
    if (new Date(date).getTime() <= new Date().getTime()) {
      throw new Error('Error: The selected date cannot be in the past. Please choose a date in the future.');
    }
  }

  /**
   * @param taskId {number}
   * @param userId {number}
   * @param date {string}
   * @returns {Promise<*>}
   */
  static async createReminder ({
    userId = required(),
    taskId = required(),
    date = required()
  } = {}) {
    this._checkIFDateMoreThanNow(date);

    const user = await UserRepo.getUserByWhereCase({
      whereCase: {
        id: userId
      }
    });

    const reminder = await models.reminder.findOne({
      where: {
        userId,
        taskId
      }
    });

    if (reminder) {
      this.updateReminder({
        id: reminder.id,
        userId,
        taskId,
        date
      });

      return reminder.get();
    }

    const createdReminder = await models.reminder.create({
      userId,
      taskId,
      remindAt: date

    });

    const endDate = moment(date).add(5, 'minutes').toISOString();

    try {
      const res = await awsScheduler.scheduleReminder({
        timezoneName: user.profile.timezoneName,
        reminder: {
          id: createdReminder.id,
          userId,
          startDate: date,
          endDate: endDate
        }
      });

      createdReminder.scheduleArn = res.ScheduleArn;
      createdReminder.save();
    } catch (error) {
      createdReminder.destroy({
        force: true
      });

      log.error(error);
      throw new Error('An error occurred while creating the reminder');
    }

    return createdReminder.get();
  }

  /**
   * @param id {number}
   * @param userId {number}
   * @param userId {number}
   * @param date {string}
   * @returns {Promise<*>}
   */
  static async updateReminder ({
    id = required(),
    userId = required(),
    taskId = required(),
    date = required()
  } = {}) {
    this._checkIFDateMoreThanNow(date);

    const user = await UserRepo.getUserByWhereCase({
      whereCase: {
        id: userId
      }
    });

    const count = await models.reminder.update({
      remindAt: date
    }, {
      where: {
        id,
        userId
      }
    });

    const endDate = moment(date).add(5, 'minutes').toISOString();

    await awsScheduler.updateReminder({
      timezoneName: user.profile.timezoneName,
      reminder: {
        id,
        userId,
        taskId,
        startDate: date,
        endDate: endDate
      }
    });

    return Boolean(count);
  }

  /**
   * @param userId {number}
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async deleteReminder ({
    userId = required(),
    id = required()
  } = {}) {
    const count = await models.reminder.destroy({
      where: {
        id,
        userId
      },
      force: true
    });

    await awsScheduler.deleteReminder({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: process.env.AWS_REGION,
      id,
      clientToken: userId
    });

    return Boolean(count);
  }

  /**
   * @param userId {number}
   * @return {Promise<*|null>}
   */
  static async getReminderSettings (userId = required()) {
    const reminderSettings = await models.reminderSetting.findOne({
      where: {
        userId
      }
    });

    if (!reminderSettings) {
      throw new Error('Reminder settings not found');
    }

    return reminderSettings.get();
  }

  /**
   * @param userId {number}
   * @return {Promise<*|null>}
   */
  static async createReminderSettings (userId = required(), transaction) {
    await models.reminderSetting.create({
      userId
    }, {
      transaction
    });
  }

  /**
   * @param userId {number}
   * @param allowSendToEmail {boolean}
   * @param allowSendToPush {boolean}
   * @return {Promise<*|null>}
   */
  static async updateReminderSettings ({
    userId = required(),
    allowSendToEmail,
    allowSendToPush
  } = {}) {
    const count = await models.reminderSetting.update({
      allowSendToEmail,
      allowSendToPush
    }, {
      where: {
        userId
      }
    });

    return Boolean(count);
  }
}

module.exports = ReminderRepo;
