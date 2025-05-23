'use strict';

module.exports = (sequelize, Sequelize) => {
  const bookFolder = sequelize.define('bookFolder', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    favorite: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: true
    },
    archivedAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    tableName: 'book_folders'
  });

  bookFolder.associate = (models) => {
    bookFolder.hasMany(models.book);
    bookFolder.hasOne(models.bookOrder);
    bookFolder.belongsTo(models.team);
  };

  return bookFolder;
};
