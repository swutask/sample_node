'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.renameColumn('books', 'hide', 'is_calendar');
  },

  async down (queryInterface) {
    await queryInterface.renameColumn('books', 'is_calendar', 'hide');
  }
};
