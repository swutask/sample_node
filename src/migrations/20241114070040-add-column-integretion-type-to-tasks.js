'use strict';
const Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.addColumn(
      'tasks',
      'integration_type',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      'tasks',
      'html_link',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down (queryInterface) {
    await queryInterface.removeColumn(
      'tasks',
      'integration_type'
    );
    await queryInterface.removeColumn(
      'tasks',
      'html_link'
    );
  }
};
