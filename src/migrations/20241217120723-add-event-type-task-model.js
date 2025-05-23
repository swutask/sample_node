'use strict';
const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn(
      'tasks',
      'event_type',
      {
        type: Sequelize.STRING,
        defaultValue: 'complex-task',
        allowNull: true
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      'tasks',
      'event_type'
    );
  }
};
