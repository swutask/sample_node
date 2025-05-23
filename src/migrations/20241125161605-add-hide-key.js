'use strict';

const Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.addColumn(
      'books',
      'hide',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }
    );
  },

  async down (queryInterface) {
    await queryInterface.removeColumn(
      'books',
      'hide'
    );
  }
};
