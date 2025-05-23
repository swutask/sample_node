'use strict';

module.exports = (sequelize, Sequelize) => {
  const activeTool = sequelize.define('sidebarTool', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    calendar: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    chat: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'sidebar_tools'
  });

  activeTool.associate = (models) => {
    activeTool.belongsTo(models.user);
  };

  return activeTool;
};
