'use strict';

const config = require('../config');
const bcrypt = require('bcrypt');

module.exports = (sequelize, Sequelize) => {
  const user = sequelize.define('user', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      set (value) {
        this.setDataValue('email', value.toLowerCase());
      }
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 64],
          msg: 'Password must be 6-64 in length'
        }
      }
    },
    emailConfirmedAt: {
      type: Sequelize.DATE,
      defaultValue: null
    },
    isPassword: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    isClient: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'users'
  });

  const hookPassword = async (instance) => {
    if (!instance.changed('password')) return;
    const hash = await bcrypt.hash(instance.password, config.saltRounds);
    instance.password = hash;
  };

  user.beforeCreate(hookPassword);
  user.beforeUpdate(hookPassword);

  user.prototype.isValidPassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  user.associate = (models) => {
    user.hasOne(models.sidebarTool);
    user.hasOne(models.settings);
    user.hasOne(models.profile);
    user.hasOne(models.team);
    user.hasOne(models.teamMember);
    user.hasOne(models.avatar);
    user.hasOne(models.teamLogo);
    user.hasOne(models.inbox);
    user.hasOne(models.onboarding);
    user.hasOne(models.filter);
    user.hasOne(models.taskSubscription);
    user.hasOne(models.reminderSetting);
    user.hasOne(models.quickThoughts);

    user.hasMany(models.reminder);
    user.hasMany(models.project);
    user.hasMany(models.comment);
    user.hasMany(models.subscription);
    user.hasMany(models.message);
    user.hasMany(models.reactionToMessage);
    user.hasMany(models.chatSetting);
    user.hasMany(models.messageStatus);
    user.hasMany(models.bookOrder);
    user.hasMany(models.templateOrder);
    user.hasMany(models.notification);
    user.hasMany(models.teamAccess);

    user.hasMany(models.privateChat, {
      foreignKey: 'creator_id',
      as: 'creator'
    });
    user.hasMany(models.privateChat, {
      foreignKey: 'member_id',
      as: 'member'
    });

    user.belongsTo(models.role);

    user.belongsToMany(models.team, {
      through: 'teamAccess',
      foreignKey: 'otherTeamId'
    });
  };

  user.prototype.json = function () {
    const result = {
      id: this.id,
      email: this.email,
      createdAt: this.createdAt,
      isPassword: this.isPassword,
      isClient: this.isClient
    };
    if (this.profile) {
      result.profile = {
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        userName: this.profile.userName,
        location: this.profile.location,
        timezone: this.profile.timezone,
        position: this.profile.position,
        showBookOnboarding: this.profile.showBookOnboarding,
        showProjectOnboarding: this.profile.showProjectOnboarding,
        showUpgradeToPro: this.profile.showUpgradeToPro,
        color: this.profile.color
      };
    }
    if (this.role) {
      result.role = {
        name: this.role.name
      };
    }

    if (this.avatar) {
      result.avatar = {
        url: this.avatar.url
      };
    }

    result.onboarding = this.onboarding;

    return result;
  };

  return user;
};
