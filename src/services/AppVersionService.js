'use strict';

const models = require('../models');

class AppVersionService {
  static async getVersion () {
    return models.appVersion.findOne({
      attributes: {
        exclude: ['id']
      },
      raw: true,
      order: [['id', 'DESC']]
    });
  }
}

module.exports = AppVersionService;
