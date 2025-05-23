'use strict';

module.exports = (sequelize, Sequelize) => {
  const book = sequelize.define('book', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING(1024),
      allowNull: false
    },
    subTitle: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    color: {
      type: Sequelize.STRING,
      allowNull: true
    },
    isSection: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isSample: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    archivedAt: {
      type: Sequelize.DATE,
      allowNull: true
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
    isCalendar: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'books'
  });

  book.associate = (models) => {
    book.belongsTo(models.user);
    book.belongsTo(models.team);
    book.belongsTo(models.bookFolder);

    book.hasOne(models.chat);
    book.hasOne(models.bookOrder);
    book.hasOne(models.filter);

    book.hasMany(models.project);
    book.hasMany(models.notification);
    book.hasMany(models.attachment);
    book.hasMany(models.bookLink);
    book.hasMany(models.teamAccess, { as: 'memberTeamAccesses' });
    book.hasMany(models.teamAccess, { as: 'clientTeamAccesses' });

    book.belongsToMany(models.team, {
      through: 'teamAccess',
      foreignKey: 'otherTeamId'
    });
  };

  return book;
};
