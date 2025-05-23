'use strict';

module.exports = (sequelize, Sequelize) => {
  const teamLogo = sequelize.define('teamLogo', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    size: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: Sequelize.STRING,
      allowNull: false
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'team_logos',
    updatedAt: false
  });

  teamLogo.associate = (models) => {
    teamLogo.belongsTo(models.user);
    teamLogo.belongsTo(models.team);
  };

  return teamLogo;
};
