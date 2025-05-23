'use strict';

module.exports = (sequelize, Sequelize) => {
  const announcement = sequelize.define('announcement', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING(40),
      allowNull: false
    },
    subTitle: {
      type: Sequelize.STRING(140),
      allowNull: false
    }
  }, {
    tableName: 'announcements'
  });

  announcement.associate = (models) => {
    announcement.belongsTo(models.team);
  };

  return announcement;
};
