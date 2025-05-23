'use strict';
const models = require('../models');
const { required } = require('../utils');

class SettingsService {
  static async getByUserId (userId) {
    const settings = await models.settings.findOne({
      where: {
        userId: userId
      }
    });

    if (!settings) throw new Error('Settings not found');

    return { settings };
  }

  static async update ({
    userId = required(),
    mode,
    columnWidth,
    fontSize,
    fontFamily,
    theme,
    bookView,
    lineHeight,
    grammarCheck,
    taskOrdering,
    taskFullScreen
  } = {}) {
    const [count] = await models.settings.update(
      {
        mode: mode,
        columnWidth: columnWidth,
        fontSize: fontSize,
        fontFamily: fontFamily,
        theme: theme,
        bookView: bookView,
        lineHeight,
        grammarCheck,
        taskOrdering,
        taskFullScreen
      },
      {
        where: {
          userId: userId
        }
      }
    );

    if (!count) {
      throw new Error('Settings not found');
    }
  }

  static async getSidebarToolsByUserId (userId) {
    const tools = await models.sidebarTool.findOne({
      where: {
        userId: userId
      }
    });

    if (!tools) throw new Error('Tools not found');

    return tools;
  }

  static async updateSidebarTools ({
    userId = required(),
    tools = required()
  }) {
    return models.sidebarTool.update(tools, {
      where: {
        userId
      }
    });
  }
}

module.exports = SettingsService;
