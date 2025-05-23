'use strict';

module.exports = (sequelize, Sequelize) => {
  const reminder = sequelize.define('reminder', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    remindAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    scheduleArn: {
      type: Sequelize.STRING(1225),
      allowNull: true
    }
  }, {
    tableName: 'reminders'
  });

  reminder.associate = (models) => {
    reminder.belongsTo(models.user);
    reminder.belongsTo(models.task);
  };

  return reminder;
};
