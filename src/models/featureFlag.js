'use strict';

module.exports = (sequelize, Sequelize) => {
  const featureFlag = sequelize.define('featureFlag', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    active: {
      type: Sequelize.BOOLEAN,
      allowNull: true
    }
  }, {
    tableName: 'feature_flags'
  });

  return featureFlag;
};
