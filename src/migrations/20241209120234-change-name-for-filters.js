'use strict';

const Sequelize = require('sequelize');

module.exports = {
  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  up: async (queryInterface) => {
    await queryInterface.changeColumn(
      'filters',
      'name',
      {
        type: Sequelize.STRING,
        defaultValue: 'By due date',
        allowNull: false
      }
    );
  },

  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  down: async (queryInterface) => {
    await queryInterface.changeColumn(
      'filters',
      'name',
      {
        type: Sequelize.STRING,
        defaultValue: 'Task overview',
        allowNull: false
      }
    );
  }
};
