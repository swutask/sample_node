'use strict';

/**
 * @param sequelize {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const taskSubscription = sequelize.define('taskSubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'task_subscriptions',
    indexes: [{
      unique: true,
      fields: ['task_id', 'user_id'],
      type: 'unique'
    }]
  });

  taskSubscription.associate = (models) => {
    taskSubscription.belongsTo(models.user);
    taskSubscription.belongsTo(models.task);
  };

  return taskSubscription;
};
