'use strict';

module.exports = (sequelize, Sequelize) => {
  const appVersion = sequelize.define('appVersion', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    windows: {
      type: Sequelize.INTEGER
    },
    mac: {
      type: Sequelize.INTEGER
    },
    iphone: {
      type: Sequelize.INTEGER
    },
    android: {
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'app_versions',
    timestamps: false
  });

  return appVersion;
};
