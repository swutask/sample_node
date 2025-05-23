'use strict';

module.exports = (sequelize, Sequelize) => {
  const stripeUser = sequelize.define('stripeUser', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    stripeId: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    }
  }, {
    tableName: 'stripe_users',
    indexes: [{
      unique: true,
      fields: ['user_id']
    }]
  });

  stripeUser.associate = (models) => {
    stripeUser.belongsTo(models.user);
    stripeUser.belongsTo(models.team);
  };

  return stripeUser;
};
