'use strict';

module.exports = (sequelize, Sequelize) => {
  const tagToTask = sequelize.define('tagToTask', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'tag_to_tasks'
  });

  tagToTask.associate = (models) => {
    tagToTask.belongsTo(models.task);
    tagToTask.belongsTo(models.taskTag);
  };

  return tagToTask;
};
