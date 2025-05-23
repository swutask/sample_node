'use strict';

module.exports = (sequelize, Sequelize) => {
  const chat = sequelize.define('chat', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    isMain: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'chats'
  });

  chat.associate = (models) => {
    chat.belongsTo(models.book);
    chat.belongsTo(models.attachment);
    chat.belongsTo(models.team);
    chat.belongsTo(models.task);

    chat.hasOne(models.chatSetting);

    chat.hasMany(models.message);
    chat.hasMany(models.messageStatus);
    chat.hasMany(models.notification);
    chat.hasMany(models.privateChat);
  };

  return chat;
};
