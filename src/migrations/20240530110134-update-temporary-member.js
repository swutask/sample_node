'use strict';

const Sequelize = require('sequelize');

module.exports = {
  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  up: async (queryInterface) => {
    await queryInterface.changeColumn(
      'temporary_members',
      'book_ids',
      {
        type: Sequelize.STRING(2000),
        allowNull: true
      }
    );
  },

  /**
   * @param queryInterface  {import('sequelize').QueryInterface}
   * @return {Promise<void>}
   */
  down: async (queryInterface) => {
    await queryInterface.changeColumn(
      'temporary_members',
      'book_ids',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  }
};
