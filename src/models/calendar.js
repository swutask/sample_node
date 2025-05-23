'use strict';

// TODO delete
module.exports = (sequelize, Sequelize) => {
  const calendar = sequelize.define('calendar', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'calendars'
  });

  calendar.associate = (models) => {
    calendar.belongsTo(models.user);
    calendar.belongsTo(models.team);
  };

  return calendar;
};
