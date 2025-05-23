'use strict';

module.exports = (sequelize, Sequelize) => {
  const facebookUser = sequelize.define('facebookUser', {
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
    tableName: 'facebook_users'
  });

  facebookUser.associate = (models) => {
    facebookUser.belongsTo(models.user);
  };

  return facebookUser;
};
