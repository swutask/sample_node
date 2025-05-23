'use strict';

const Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.changeColumn(
      'google_calendar_users',
      'add_to_google',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }
    );
  },

  async down (queryInterface) {
    await queryInterface.changeColumn(
      'google_calendar_users',
      'add_to_google',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }
    );
  }
};
