'use strict';

module.exports = (sequelize, Sequelize) => {
  const inbox = sequelize.define('inbox', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mutedUntil: {
      type: Sequelize.DATE,
      allowNull: true
    },
    receiveEmailNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    receiveWeeklyPersonalEmailNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    receiveWeeklyGeneralEmailNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    receiveTaskDeadlineNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    receiveDailyTasksNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailProjectInvite: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailRoleChange: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailTaskAssign: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailTaskUnassign: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailTaskChange: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailTaskCommentAdd: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailTaskCompleted: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailChatMessageReceive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    emailMentionCreate: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushProjectInvite: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushRoleChange: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushTaskAssign: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushTaskUnassign: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushTaskChange: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushTaskCommentAdd: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushTaskCompleted: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushChatMessageReceive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    pushMentionCreate: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'inboxes'
  });

  inbox.associate = (models) => {
    inbox.belongsTo(models.user);
    inbox.belongsTo(models.team);

    inbox.hasMany(models.notification);
    inbox.hasMany(models.inboxActivity);
  };

  return inbox;
};
