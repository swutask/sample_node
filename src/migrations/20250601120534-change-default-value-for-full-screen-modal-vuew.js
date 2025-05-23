'use strict';

const Sequelize = require('sequelize');

module.exports = {
  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  up: async (queryInterface) => {
    await queryInterface.changeColumn(
      'settings',
      'task_full_screen',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    );
  },

  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  down: async (queryInterface) => {
    await queryInterface.changeColumn(
      'settings',
      'task_full_screen',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    );
  }
};
