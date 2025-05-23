'use strict';

const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('reminder_settings');

    await queryInterface.createTable(
      'reminder_settings',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        allow_send_to_email: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        allow_send_to_push: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'users' },
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        deleted_at: {
          allowNull: true,
          type: Sequelize.DATE
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reminder_settings');
  }
};
