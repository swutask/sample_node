'use strict';

module.exports = (sequelize, Sequelize) => {
  const subscription = sequelize.define('subscription', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    data: {
      type: Sequelize.JSONB,
      allowNull: false
    },
    isCancelled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    expireAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    extendable: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'subscriptions'
  });

  subscription.associate = (models) => {
    subscription.belongsTo(models.user);
    subscription.belongsTo(models.plan);
    subscription.belongsTo(models.team);
  };

  return subscription;
};
