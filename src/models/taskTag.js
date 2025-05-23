'use strict';

module.exports = (sequelize, Sequelize) => {
  const taskTag = sequelize.define('taskTag', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    color: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'task_tags'
  });

  taskTag.associate = (models) => {
    taskTag.belongsTo(models.book);
    taskTag.belongsToMany(models.task, {
      through: 'tagToTask',
      foreignKey: 'tagId'
    });
  };

  return taskTag;
};
