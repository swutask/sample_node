'use strict';

const Sequelize = require('sequelize');

module.exports = {
  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  up: async (queryInterface) => {
    await queryInterface.addColumn(
      'tasks',
      'collaboration_key',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      'tasks',
      'collaboration_key'
    );
  }
};
