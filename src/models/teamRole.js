'use strict';

module.exports = (sequelize, Sequelize) => {
  const teamRole = sequelize.define('teamRole', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    }
  }, {
    tableName: 'team_roles',
    paranoid: false,
    timestamps: false
  });

  teamRole.associate = (models) => {
    teamRole.hasMany(models.teamMember);
    teamRole.hasMany(models.temporaryMember);
  };

  return teamRole;
};
