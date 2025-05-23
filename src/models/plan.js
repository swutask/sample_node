'use strict';

module.exports = (sequelize, Sequelize) => {
  const plan = sequelize.define('plan', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    provider: {
      type: Sequelize.STRING,
      allowNull: true
    },
    data: {
      type: Sequelize.JSONB,
      allowNull: true
    },
    maxSize: {
      type: Sequelize.BIGINT,
      allowNull: false
    },
    maxBooks: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    maxMembers: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    maxClients: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    maxProjects: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    recurringPeriod: {
      type: Sequelize.SMALLINT,
      allowNull: true
    },
    recurringPer: {
      type: Sequelize.STRING(10),
      allowNull: true
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    pricePerMonth: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    singleFileSize: {
      type: Sequelize.BIGINT,
      allowNull: false
    },
    maxTasks: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'plans',
    paranoid: false,
    updatedAt: false
  });

  return plan;
};
