'use strict';

module.exports = (sequelize, Sequelize) => {
  const messageStatus = sequelize.define('messageStatus', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: Sequelize.ENUM('read', 'unread'),
      allowNull: false
    }
  }, {
    tableName: 'message_status'
  });

  messageStatus.associate = (models) => {
    messageStatus.belongsTo(models.user);
    messageStatus.belongsTo(models.message);
    messageStatus.belongsTo(models.chat);
  };

  return messageStatus;
};
