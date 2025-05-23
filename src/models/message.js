'use strict';

module.exports = (sequelize, Sequelize) => {
  const message = sequelize.define('message', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    text: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    resolvedAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    tableName: 'messages'
  });

  message.associate = (models) => {
    message.belongsTo(models.user);
    message.belongsTo(models.chat);
    message.hasOne(models.annotation);

    message.hasOne(models.messageStatus);

    message.hasMany(models.attachment);
    message.hasMany(models.message, {
      as: 'thread',
      foreignKey: 'threadId'
    });

    message.belongsToMany(models.reaction, {
      through: { model: 'reactionToChatMessage', unique: false },
      foreignKey: 'messageId'
    });

    message.belongsTo(models.message, {
      foreignKey: 'replyId',
      as: 'reply'
    });
  };

  return message;
};
