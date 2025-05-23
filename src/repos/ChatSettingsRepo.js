const models = require('../models');
const { required } = require('../utils');
class ChatSettingsRepo {
  static async createMany ({
    settings = required(),
    transaction = null
  }) {
    const chatSettings = await models.chatSetting.bulkCreate(settings, { transaction });

    return chatSettings.map(chatSetting => chatSetting.get());
  }
}

module.exports = ChatSettingsRepo;
