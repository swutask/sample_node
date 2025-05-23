'use strict';
const colors = require('../core/colors.json');
const lastColorIndex = colors.length - 1;

module.exports = (sequelize, Sequelize) => {
  const profile = sequelize.define('profile', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userName: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    showBookOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    showProjectOnboarding: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    showUpgradeToPro: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    color: {
      type: Sequelize.STRING,
      defaultValue: () => colors[Math.floor(Math.random() * lastColorIndex)]
    },
    location: {
      type: Sequelize.STRING,
      allowNull: true
    },
    timezone: {
      type: Sequelize.STRING,
      allowNull: true
    },
    timezoneName: {
      type: Sequelize.STRING,
      allowNull: true
    },
    position: {
      type: Sequelize.STRING,
      allowNull: true
    }
  }, {
    tableName: 'profiles',
    indexes: [{
      unique: true,
      fields: ['user_id']
    }]
  });

  profile.associate = (models) => {
    profile.belongsTo(models.user);
  };

  return profile;
};
