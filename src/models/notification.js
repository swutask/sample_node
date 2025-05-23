'use strict';

module.exports = (sequelize, Sequelize) => {
  const notification = sequelize.define('notification', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    category: {
      type: Sequelize.ENUM,
      values: ['personal', 'general'],
      defaultValue: 'general',
      allowNull: false
    },
    oldBookTitle: {
      type: Sequelize.STRING,
      allowNull: true
    },
    message: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('read', 'unread'),
      allowNull: false
    }
  }, {
    tableName: 'notifications'
  });

  notification.associate = (models) => {
    notification.belongsTo(models.inbox);
    notification.belongsTo(models.user);
    notification.belongsTo(models.team);
    notification.belongsTo(models.teamMember);
    notification.belongsTo(models.project);
    notification.belongsTo(models.book);
    notification.belongsTo(models.attachment);
    notification.belongsTo(models.chat);
    notification.belongsTo(models.task);
    notification.belongsTo(models.comment);
    notification.belongsTo(models.message, {
      as: 'chatMessage'
    });
  };

  return notification;
};
