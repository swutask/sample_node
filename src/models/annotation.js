'use strict';

/**
 * @param sequelize  {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const annotation = sequelize.define('annotation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    x: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    y: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'annotations'
  });

  annotation.associate = (models) => {
    annotation.belongsTo(models.attachment);
    annotation.belongsTo(models.team);
    annotation.belongsTo(models.message, {
      onDelete: 'CASCADE'
    });
  };

  return annotation;
};
