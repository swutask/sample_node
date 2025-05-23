'use strict';

module.exports = (sequelize, Sequelize) => {
  const quickThoughts = sequelize.define('quickThoughts', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    text: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'quick_thoughts'
  });

  quickThoughts.associate = (models) => {
    quickThoughts.belongsTo(models.user);
  };

  return quickThoughts;
};
