'use strict';

module.exports = (sequelize, Sequelize) => {
  const applePayWebhook = sequelize.define('applePayWebhook', {
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
    tableName: 'apple_pay_webhooks',
    paranoid: false,
    timestamps: true,
    updatedAt: false
  });

  return applePayWebhook;
};
