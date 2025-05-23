'use strict';

module.exports = (sequelize, Sequelize) => {
  const bookOrder = sequelize.define('bookOrder', {
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
    tableName: 'book_orders',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'book_folder_id']
      },
      {
        unique: true,
        fields: ['user_id', 'book_id']
      }
    ]
  });

  bookOrder.associate = (models) => {
    bookOrder.belongsTo(models.user);
    bookOrder.belongsTo(models.bookFolder);
    bookOrder.belongsTo(models.book);
  };

  return bookOrder;
};
