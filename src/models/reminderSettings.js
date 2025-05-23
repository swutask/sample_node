'use strict';

module.exports = (sequelize, Sequelize) => {
  const reminderSetting = sequelize.define('reminderSetting', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    allowSendToEmail: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allowSendToPush: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'reminder_settings'
  });

  reminderSetting.associate = (models) => {
    reminderSetting.belongsTo(models.user);
  };

  return reminderSetting;
};
