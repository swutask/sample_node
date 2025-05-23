'use strict';

module.exports = (sequelize, Sequelize) => {
  const onboarding = sequelize.define('onboarding', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    showBookOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showProjectOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showTaskOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showWeekPlannerOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showChatOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showFileOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showTeamDashboardOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showPostOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showOverviewOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showCalendarOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showTimelineOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    showNewLookOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'onboardings'
  });

  onboarding.associate = (models) => {
    onboarding.belongsTo(models.user);
  };

  return onboarding;
};
