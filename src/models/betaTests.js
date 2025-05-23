'use strict';

module.exports = (sequelize, Sequelize) => {
  const betaTest = sequelize.define('betaTest', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      unique: true
    },
    name: {
      type: Sequelize.STRING(1024),
      allowNull: false
    }
  }, {
    tableName: 'betaTests'
  });

  betaTest.associate = (models) => {
    betaTest.hasMany(models.betaTester);
  };

  return betaTest;
};
