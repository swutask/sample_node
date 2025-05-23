'use strict';

module.exports = (sequelize, Sequelize) => {
  const temporaryClient = sequelize.define('temporaryClient', {
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
    bookIds: {
      type: Sequelize.STRING(2000),
      allowNull: true
    }
  }, {
    tableName: 'temporary_clients'
  });

  temporaryClient.associate = (models) => {
    temporaryClient.belongsTo(models.team);
  };

  return temporaryClient;
};
