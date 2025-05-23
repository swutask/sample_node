'use strict';

module.exports = (sequelize, Sequelize) => {
  const googleUser = sequelize.define('googleUser', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    profile: {
      type: Sequelize.JSONB,
      allowNull: false
    },
    refreshToken: {
      type: Sequelize.STRING
    },
    accessToken: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'google_users'
  });

  googleUser.associate = (models) => {
    googleUser.belongsTo(models.user);
  };

  return googleUser;
};
