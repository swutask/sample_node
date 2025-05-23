'use strict';

module.exports = (sequelize, Sequelize) => {
  const bookLink = sequelize.define('bookLink', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'book_links'
  });

  bookLink.associate = (models) => {
    bookLink.belongsTo(models.book);
  };

  return bookLink;
};
