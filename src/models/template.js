'use strict';

module.exports = (sequelize, Sequelize) => {
  const template = sequelize.define('template', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    projectTitle: {
      type: Sequelize.STRING,
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'templates'
  });

  template.associate = (models) => {
    template.belongsTo(models.user);
    template.belongsTo(models.team);
    template.hasOne(models.templateOrder);
    template.hasMany(models.templateAttachment);
  };

  return template;
};
