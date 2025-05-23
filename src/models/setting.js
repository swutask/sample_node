'use strict';

module.exports = (sequelize, Sequelize) => {
  const settings = sequelize.define('settings', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mode: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Paperless'
    },
    columnWidth: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Normal'
    },
    fontSize: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Large'
    },
    fontFamily: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Inter'
    },
    theme: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'light'
    },
    bookView: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Card'
    },
    lineHeight: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '1.6'
    },
    grammarCheck: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    taskOrdering: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    taskFullScreen: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'settings',
    indexes: [{
      unique: true,
      fields: ['user_id']
    }]
  });

  settings.associate = (models) => {
    settings.belongsTo(models.user);
  };

  return settings;
};
