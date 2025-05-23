'use strict';

module.exports = (sequelize, Sequelize) => {
  const applePayReceipt = sequelize.define('applePayReceipt', {
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
    tableName: 'apple_pay_receipts',
    paranoid: false,
    timestamps: true,
    updatedAt: false
  });

  return applePayReceipt;
};
