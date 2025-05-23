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
      'theme',
      {
        type: Sequelize.STRING,
        defaultValue: 'light',
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
      'settings',
      'theme',
      {
        type: Sequelize.STRING,
        defaultValue: 'light',
        allowNull: false
      }
    );
  }
};
