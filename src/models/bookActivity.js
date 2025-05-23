'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const bookActivity = sequelize.define('bookActivity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'book_activities'
  });

  bookActivity.associate = (models) => {
    bookActivity.belongsTo(models.activity);
    bookActivity.belongsTo(models.book);
    bookActivity.belongsTo(models.team);
  };

  return bookActivity;
};
