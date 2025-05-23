'use strict';

module.exports = (sequelize, Sequelize) => {
  const googleCalendarUser = sequelize.define('googleCalendarUser', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    refreshToken: {
      type: Sequelize.STRING
    },
    accessToken: {
      type: Sequelize.STRING,
      allowNull: false
    },
    channelId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    resourceId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    active: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    addToGoogle: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      set (value) {
        this.setDataValue('email', value.toLowerCase());
      }
    }
  }, {
    tableName: 'google_calendar_users'
  });

  googleCalendarUser.associate = (models) => {
    googleCalendarUser.belongsTo(models.user);
  };

  return googleCalendarUser;
};
