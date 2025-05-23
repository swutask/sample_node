'use strict';

module.exports = (sequelize, Sequelize) => {
  const templateOrder = sequelize.define('templateOrder', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 9999
    }
  }, {
    tableName: 'template_orders'
  });

  templateOrder.associate = (models) => {
    templateOrder.belongsTo(models.user);
    templateOrder.belongsTo(models.template);
  };

  return templateOrder;
};
