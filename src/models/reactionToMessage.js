'use strict';

module.exports = (sequelize, Sequelize) => {
  const reactionToMessage = sequelize.define('reactionToMessage', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    tableName: 'reaction_to_messages'
  });

  reactionToMessage.associate = (models) => {
    reactionToMessage.belongsTo(models.user);
    reactionToMessage.belongsTo(models.reaction);
  };

  return reactionToMessage;
};
