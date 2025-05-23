'use strict';

module.exports = (sequelize, Sequelize) => {
  const privateChat = sequelize.define('privateChat', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'private_chat'
  });

  privateChat.associate = (models) => {
    privateChat.belongsTo(models.chat, {
      as: 'chat'
    });
    privateChat.belongsTo(models.user, {
      as: 'creator'
    });
    privateChat.belongsTo(models.user, {
      as: 'member'
    });
  };

  return privateChat;
};
