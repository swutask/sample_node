'use strict';

module.exports = (sequelize, Sequelize) => {
  const temporaryMember = sequelize.define('temporaryMember', {
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
    tableName: 'temporary_members'
  });

  temporaryMember.associate = (models) => {
    temporaryMember.belongsTo(models.team);
    temporaryMember.belongsTo(models.teamRole);
  };

  return temporaryMember;
};
