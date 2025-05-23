'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.removeColumn(
      'subscriptions',
      'version'
    );
  },

  down: async (queryInterface) => {
    return queryInterface.addColumn(
      'subscriptions',
      'version',
      {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    );
  }
};
