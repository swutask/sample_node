'use strict';
const Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.addColumn(
      'tasks',
      'start_time',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      'tasks',
      'end_time',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down (queryInterface) {
    await queryInterface.removeColumn(
      'tasks',
      'start_time'
    );
    await queryInterface.removeColumn(
      'tasks',
      'end_time'
    );
  }
};
