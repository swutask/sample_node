'use strict';

module.exports = (sequelize, Sequelize) => {
  const chatSetting = sequelize.define('chatSetting', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mutedAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    tableName: 'chat_settings'
  });

  chatSetting.associate = (models) => {
    chatSetting.belongsTo(models.user);
    chatSetting.belongsTo(models.chat);
  };

  return chatSetting;
};
