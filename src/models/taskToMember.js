'use strict';

module.exports = (sequelize, Sequelize) => {
  const taskToMember = sequelize.define('taskToMember', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'task_to_members'
  });

  taskToMember.associate = (models) => {
    taskToMember.belongsTo(models.task);
    taskToMember.belongsTo(models.teamMember);
  };

  return taskToMember;
};
