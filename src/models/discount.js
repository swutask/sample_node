'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const discount = sequelize.define('discount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('coupon', 'credit'),
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    appliesTo: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'discounts'
  });

  discount.associate = (models) => {
    discount.belongsTo(models.team);
  };

  return discount;
};
