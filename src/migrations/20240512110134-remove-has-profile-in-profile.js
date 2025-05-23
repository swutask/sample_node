'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.removeColumn(
      'profiles',
      'has_personal'
    );
  },

  down: async (queryInterface) => {
    return queryInterface.addColumn(
      'profiles',
      'has_personal',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    );
  }
};
