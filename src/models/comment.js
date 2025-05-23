'use strict';

module.exports = (sequelize, Sequelize) => {
  const comment = sequelize.define('comment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    body: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'comments'
  });

  comment.associate = (models) => {
    comment.hasMany(models.notification);

    comment.belongsTo(models.project);
    comment.belongsTo(models.user);
    comment.belongsTo(models.comment, {
      foreignKey: 'parentId'
    });
  };

  return comment;
};
