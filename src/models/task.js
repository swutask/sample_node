'use strict';

/**
 * @param sequelize {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const task = sequelize.define('task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    collaborationKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subTitle: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    additionalInfo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isSample: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isToday: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    urgentStatus: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true
    },
    storyPoints: {
      type: DataTypes.SMALLINT,
      defaultValue: null,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    position: {
      type: DataTypes.ENUM,
      values: ['0', '1', '2', '3'],
      defaultValue: '0',
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 9999,
      allowNull: false
    },
    homeOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 9999,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rrule: {
      type: DataTypes.STRING,
      allowNull: true
    },
    integrationType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    htmlLink: {
      type: DataTypes.STRING,
      allowNull: true
    },
    startEventTime: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endEventTime: {
      type: DataTypes.STRING,
      allowNull: true
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'complex-task'
    },
    calendarId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'complex-calendar'
    }
  }, {
    tableName: 'tasks'
  });

  task.associate = (models) => {
    task.belongsTo(models.user);
    task.belongsTo(models.team);
    task.belongsTo(models.book);
    task.belongsTo(models.project);
    task.belongsTo(models.taskRow);

    task.hasMany(models.reminder);
    task.hasMany(models.attachment);
    task.hasMany(models.notification);
    task.hasMany(models.taskToMember);
    task.hasMany(models.taskSubscription);

    task.hasOne(models.chat);

    task.belongsToMany(models.taskTag, {
      through: 'tagToTask',
      foreignKey: 'taskId'
    });

    task.belongsToMany(models.teamMember, {
      through: 'taskToMember',
      foreignKey: 'taskId'
    });

    task.hasMany(models.task, {
      foreignKey: 'parentId',
      as: 'subTask'
    });

    task.belongsTo(models.task, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    task.belongsTo(models.task, {
      foreignKey: 'movedFromTaskId',
      as: 'movedFromTask'
    });
  };

  return task;
};
