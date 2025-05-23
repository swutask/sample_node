'use strict';

const { customAlphabet } = require('nanoid');
const alphabet = require('nanoid-dictionary/lowercase');
const def = customAlphabet(alphabet, 10);

module.exports = (sequelize, Sequelize) => {
  const shareLink = sequelize.define('shareLink', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: def
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    mode: {
      type: Sequelize.ENUM('read', 'write'),
      allowNull: false
    }
  }, {
    tableName: 'share_links',
    indexes: [{
      unique: true,
      fields: ['project_id']
    }]
  });

  shareLink.associate = (models) => {
    shareLink.belongsTo(models.user);
    shareLink.belongsTo(models.project);
  };

  shareLink.prototype.toJson = function () {
    return {
      id: this.id,
      projectId: this.projectId,
      isActive: this.isActive,
      mode: this.mode,
      createdAt: this.createdAt
    };
  };

  return shareLink;
};
