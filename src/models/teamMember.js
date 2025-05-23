'use strict';

module.exports = (sequelize, Sequelize) => {
  const teamMember = sequelize.define('teamMember', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hasBillingAccess: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'team_members'
  });

  teamMember.associate = (models) => {
    teamMember.belongsTo(models.user);
    teamMember.belongsTo(models.teamRole);
    teamMember.belongsTo(models.team);

    teamMember.hasMany(models.notification);

    teamMember.belongsToMany(models.task, {
      through: 'taskToMember',
      foreignKey: 'teamMemberId'
    });
  };

  return teamMember;
};
