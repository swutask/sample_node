'use strict';

module.exports = (sequelize, Sequelize) => {
  const betaTester = sequelize.define('betaTester', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    }
  }, {
    tableName: 'betaTesters'
  });

  betaTester.associate = (models) => {
    betaTester.belongsTo(models.betaTest);
  };

  return betaTester;
};
