'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const onboardingTaskSetting = sequelize.define('onboardingTaskSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    completedTasksCount: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0
    },
    videoWatched: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    projectCreated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    tasksCreated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    tasksGrouped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    teamMemberInvited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'onboarding_task_settings'
  });

  onboardingTaskSetting.associate = (models) => {
    onboardingTaskSetting.belongsTo(models.team);
  };

  return onboardingTaskSetting;
};
