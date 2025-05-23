'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.renameColumn('tasks', 'start_time', 'start_event_time');
    await queryInterface.renameColumn('tasks', 'end_time', 'end_event_time');
  },

  async down (queryInterface) {
    await queryInterface.renameColumn('tasks', 'start_event_time', 'start_time');
    await queryInterface.renameColumn('tasks', 'end_event_time', 'end_time');
  }
};
