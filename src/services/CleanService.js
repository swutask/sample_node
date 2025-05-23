'use strict';
const models = require('../models');
const { required } = require('../utils');

class CleanService {
  // TODO move to repo
  static async cleanChat ({
    chatId = required(),
    t = required()
  } = {}) {
    if (Array.isArray(chatId) && !chatId.length) {
      return;
    }

    await models.chat.destroy({
      where: {
        id: chatId
      },
      force: true,
      paranoid: false,
      transaction: t
    });
  }
}

module.exports = CleanService;
