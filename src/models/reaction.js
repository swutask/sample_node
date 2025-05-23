'use strict';

module.exports = (sequelize, Sequelize) => {
  const reaction = sequelize.define('reaction', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'reactions'
  });

  reaction.associate = (models) => {
    reaction.belongsToMany(models.message, {
      through: { model: 'reactionToChatMessage', unique: false },
      foreignKey: 'reactionId'
    });
  };

  return reaction;
};
