'use strict';

module.exports = (sequelize, Sequelize) => {
  const reactionToChatMessage = sequelize.define('reactionToChatMessage', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'reaction_to_chat_message'
  });

  reactionToChatMessage.associate = (models) => {
    reactionToChatMessage.belongsTo(models.user);
    reactionToChatMessage.belongsTo(models.message);
    reactionToChatMessage.belongsTo(models.reaction);
  };

  return reactionToChatMessage;
};
