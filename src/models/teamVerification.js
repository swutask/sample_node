'use strict';

module.exports = (sequelize, Sequelize) => {
  const teamVerification = sequelize.define('teamVerification', {
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
      },
      set (value) {
        this.setDataValue('email', value.toLowerCase());
      }
    },
    code: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    expireAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    tableName: 'team_verifications'
  });

  return teamVerification;
};
