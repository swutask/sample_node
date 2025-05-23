'use strict';

module.exports = (sequelize, Sequelize) => {
  const attachment = sequelize.define('attachment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    size: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: Sequelize.STRING,
      allowNull: false
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    isTaskThumbnail: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    showInModal: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    showInCard: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    order: {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 999
    },
    externalVersion: {
      type: Sequelize.STRING,
      allowNull: true
    },
    version: {
      type: Sequelize.SMALLINT,
      allowNull: true,
      defaultValue: 1
    },
    status: {
      type: Sequelize.SMALLINT,
      allowNull: true
    }
  }, {
    tableName: 'attachments',
    updatedAt: false
  });

  attachment.associate = (models) => {
    attachment.belongsTo(models.user);
    attachment.belongsTo(models.book);
    attachment.belongsTo(models.team);
    attachment.belongsTo(models.project);
    attachment.belongsTo(models.task);
    attachment.belongsTo(models.message);

    attachment.hasOne(models.chat);

    attachment.hasMany(models.attachment, {
      as: 'subversion',
      foreignKey: 'originalId'
    });
  };

  return attachment;
};
