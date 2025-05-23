'use strict';

const Sequelize = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('reminders');

    await queryInterface.createTable(
      'reminders',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        remind_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        schedule_arn: {
          allowNull: true,
          type: Sequelize.STRING(1225)
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
        task_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'tasks' },
            key: 'id'
          }
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
    await queryInterface.dropTable('reminders');
  }
};
