'use strict';

module.exports = (sequelize, Sequelize) => {
  const avatar = sequelize.define('avatar', {
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
    tableName: 'avatars',
    updatedAt: false
  });

  avatar.associate = (models) => {
    avatar.belongsTo(models.user);
  };

  return avatar;
};
