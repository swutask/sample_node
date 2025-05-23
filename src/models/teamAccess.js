'use strict';

module.exports = (sequelize, Sequelize) => {
  const teamAccess = sequelize.define('teamAccess', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mode: {
      type: Sequelize.ENUM('read', 'write'),
      allowNull: false
    }
  }, {
    tableName: 'team_accesses'
  });

  teamAccess.associate = (models) => {
    teamAccess.belongsTo(models.team);
    teamAccess.belongsTo(models.user);
    teamAccess.belongsTo(models.book);
    teamAccess.belongsTo(models.project);
  };

  return teamAccess;
};
