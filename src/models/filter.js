'use strict';

module.exports = (sequelize, Sequelize) => {
  const filter = sequelize.define('filter', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      defaultValue: 'Task overview',
      allowNull: false
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 9999,
      allowNull: false
    },
    task: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'filters'
  });

  filter.associate = (models) => {
    filter.belongsTo(models.book);
    filter.belongsTo(models.user);
  };

  return filter;
};
