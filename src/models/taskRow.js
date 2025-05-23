'use strict';

module.exports = (sequelize, Sequelize) => {
  const taskRow = sequelize.define('taskRow', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    color: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 9999,
      allowNull: false
    }
  }, {
    tableName: 'task_rows'
  });

  taskRow.associate = (models) => {
    taskRow.belongsTo(models.user);
    taskRow.belongsTo(models.team);
    taskRow.belongsTo(models.book);

    taskRow.hasMany(models.task);
  };

  return taskRow;
};
