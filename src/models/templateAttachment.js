'use strict';

module.exports = (sequelize, Sequelize) => {
  const templateAttachment = sequelize.define('templateAttachment', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: Sequelize.STRING,
      allowNull: false
    },
    isThumbnail: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'templateAttachments',
    updatedAt: false
  });

  templateAttachment.associate = (models) => {
    templateAttachment.belongsTo(models.user);
    templateAttachment.belongsTo(models.template);
  };

  return templateAttachment;
};
