'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const taskActivity = sequelize.define('taskActivity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'task_activities'
  });

  taskActivity.associate = (models) => {
    taskActivity.belongsTo(models.activity);
    taskActivity.belongsTo(models.task);
    taskActivity.belongsTo(models.team);
  };

  return taskActivity;
};
