'use strict';

module.exports = (sequelize, Sequelize) => {
  const log = sequelize.define('log', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    message: {
      type: Sequelize.STRING,
      allowNull: true
    },
    stack: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'logs'
  });

  log.associate = (models) => {
    log.belongsTo(models.user);
    log.belongsTo(models.team);
  };

  return log;
};
