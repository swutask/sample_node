'use strict';

const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable(
      'feature_flags',
      {
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
        },
        deleted_at: {
          allowNull: true,
          type: Sequelize.DATE
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('feature_flags');
  }
};
