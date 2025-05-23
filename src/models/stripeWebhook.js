'use strict';

module.exports = (sequelize, Sequelize) => {
  const stripeWebhook = sequelize.define('stripeWebhook', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    data: {
      type: Sequelize.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'stripe_webhooks',
    paranoid: false,
    timestamps: true,
    updatedAt: false
  });

  return stripeWebhook;
};
