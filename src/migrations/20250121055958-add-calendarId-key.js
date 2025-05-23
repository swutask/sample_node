'use strict';
const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn(
      'tasks',
      'calendar_id',
      {
        type: Sequelize.STRING,
        defaultValue: 'complex-calendar',
        allowNull: true
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      'tasks',
      'calendar_id'
    );
  }
};
