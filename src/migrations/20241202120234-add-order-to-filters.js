'use strict';

const Sequelize = require('sequelize');

module.exports = {
  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  up: async (queryInterface) => {
    await queryInterface.addColumn(
      'filters',
      'order',
      {
        type: Sequelize.INTEGER,
        defaultValue: 9999,
        allowNull: false
      }
    );
  },

  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      'filters',
      'order'
    );
  }
};
