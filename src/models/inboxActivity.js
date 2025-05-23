'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const inboxActivity = sequelize.define('inboxActivity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: DataTypes.ENUM('read', 'unread'),
      defaultValue: 'unread',
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('private', 'public'),
      defaultValue: 'public',
      allowNull: false
    }
  }, {
    tableName: 'inbox_activities'
  });

  inboxActivity.associate = (models) => {
    inboxActivity.belongsTo(models.activity);
    inboxActivity.belongsTo(models.inbox);
    inboxActivity.belongsTo(models.team);
    inboxActivity.belongsTo(models.task);
  };

  return inboxActivity;
};
