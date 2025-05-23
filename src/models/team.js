'use strict';

module.exports = (sequelize, Sequelize) => {
  const team = sequelize.define('team', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    info: {
      type: Sequelize.STRING,
      allowNull: true
    },
    link: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      set (value) {
        this.setDataValue('link', value.toLowerCase());
      }
    },
    inviteLink: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    size: {
      type: Sequelize.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'teams'
  });

  team.associate = (models) => {
    team.belongsTo(models.user);
    team.hasMany(models.temporaryMember);
    team.hasMany(models.temporaryClient);
    team.hasMany(models.attachment);
    team.hasMany(models.subscription);
    team.hasMany(models.chat);
    team.hasOne(models.teamLogo);
    team.hasMany(models.notification);
    team.hasMany(models.teamMember);
    team.hasOne(models.inbox);
    team.hasMany(models.bookFolder);

    team.belongsToMany(models.book, {
      through: 'teamAccess',
      foreignKey: 'teamId',
      otherKey: 'otherTeamId'
    });

    team.belongsToMany(models.project, {
      through: 'teamAccess',
      foreignKey: 'teamId',
      otherKey: 'otherTeamId'
    });

    team.belongsToMany(models.user, {
      through: 'teamAccess',
      foreignKey: 'teamId',
      otherKey: 'otherTeamId'
    });

    team.belongsToMany(models.client, {
      through: 'clientToTeam',
      foreignKey: 'teamId'
    });
  };

  return team;
};
