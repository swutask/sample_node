'use strict';

/**
 * @param sequelize {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const activity = sequelize.define('activity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('task', 'book'),
      allowNull: false
    }
  }, {
    tableName: 'activities'
  });

  activity.associate = (models) => {
    activity.hasOne(models.taskActivity);
    activity.hasOne(models.inboxActivity);
    activity.hasOne(models.bookActivity);

    activity.belongsTo(models.user, {
      as: 'creator',
      foreignKey: 'creatorId'
    });
    activity.belongsTo(models.user, {
      as: 'relatedUser',
      foreignKey: 'relatedUserId'
    });
  };

  return activity;
};
