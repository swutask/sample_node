'use strict';

module.exports = (sequelize, Sequelize) => {
  const clientToTeam = sequelize.define('clientToTeam', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'client_to_teams'
  });

  clientToTeam.associate = (models) => {
    clientToTeam.belongsTo(models.team);
    clientToTeam.belongsTo(models.client);
  };

  return clientToTeam;
};
