'use strict';

module.exports = (sequelize, Sequelize) => {
  const client = sequelize.define('client', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'clients'
  });

  client.associate = (models) => {
    client.belongsTo(models.user);

    client.belongsToMany(models.team, {
      through: 'clientToTeam',
      foreignKey: 'clientId'
    });
  };

  return client;
};
