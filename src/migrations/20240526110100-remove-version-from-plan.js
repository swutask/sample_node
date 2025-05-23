'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.removeColumn(
      'plans',
      'version'
    );
  },

  down: async (queryInterface) => {
    return queryInterface.addColumn(
      'plans',
      'version',
      {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    );
  }
};
