'use strict';

/**
 * @param sequelize {import('sequelize').Sequelize}
 * @param DataTypes {import('sequelize').}
 */
module.exports = (sequelize, DataTypes) => {
  const project = sequelize.define('project', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    document: {
      type: DataTypes.JSON,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 9999
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    state: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'projects'
  });

  project.associate = (models) => {
    project.belongsTo(models.user);
    project.belongsTo(models.book);

    project.hasMany(models.comment);
    project.hasMany(models.attachment);
    project.hasMany(models.notification);
    project.hasMany(models.teamAccess);
    project.hasMany(models.project, {
      foreignKey: 'parentId',
      as: 'subProject'
    });
    project.belongsTo(models.project, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    project.belongsToMany(models.team, {
      through: 'teamAccess',
      foreignKey: 'otherTeamId'
    });
  };

  return project;
};
