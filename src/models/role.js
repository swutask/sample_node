'use strict';

module.exports = (sequelize, Sequelize) => {
  const role = sequelize.define('role', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    }
  }, {
    tableName: 'roles',
    paranoid: false,
    timestamps: false
  });

  role.associate = (models) => {
    role.hasMany(models.user);
  };

  return role;
};
