'use strict';

const {
  jwt,
  hmac,
  sendgrid,
  s3
} = require('../libs');
const errors = require('../errors');
const { throwErrorWithCode } = require('../utils');
const models = require('../models');
const { sequelize: { sequelize: seq } } = require('../loaders');
const { required } = require('../utils');
const config = require('../config');
const buildUrl = require('build-url');
const { v1 } = require('uuid');
const { Op } = require('sequelize');
const StripeService = require('./StripeService');
const FilterRepo = require('../repos/FilterRepo');
const OnboardingRepo = require('../repos/OnboardingRepo');
const ReminderRepo = require('../repos/ReminderRepo');
const UserRepo = require('../repos/UserRepo');
const BookService = require('../services/BookService');

class UserService {
  static async getUserByToken (token) {
    return this._getByToken(process.env.JWT_SECRET, token);
  }

  static async getUserByOauthToken (token) {
    return this._getByToken(process.env.JWT_OAUTH_SECRET, token);
  }

  static getProfile (user) {
    return user.json();
  }

  static async updateProfile ({
    userId = required(),
    email,
    lastName,
    firstName,
    showUpgradeToPro,
    showBookOnboarding,
    showProjectOnboarding,
    location,
    timezone,
    position
  } = {}) {
    try {
      await models.user.update({
        email
      }, {
        where: {
          id: userId
        }
      });
    } catch (err) {
      throwErrorWithCode('Email used', errors.EMAIL_USED);
    }

    await seq.transaction(async t => {
      let userName;

      if (firstName && lastName) {
        userName = await this._getUserName({
          firstName,
          lastName,
          transaction: t,
          userId
        });
      }

      let timezoneName;

      if (timezone) {
        timezoneName = timezone.match(/\)\s(.*)/)[1].replace(/\s/, '_');
      }

      await models.profile.update({
        lastName,
        firstName,
        userName,
        showUpgradeToPro,
        showBookOnboarding,
        showProjectOnboarding,
        location,
        timezone,
        timezoneName,
        position
      }, {
        where: {
          userId
        },
        transaction: t
      });
    });
  }

  static async getUserByEmailAndPassword ({
    email = required(),
    password = required()
  } = {}) {
    const user = await models.user.findOne({
      where: {
        email: email.toLowerCase()
      },
      include: [{
        model: models.role,
        required: true
      }, {
        model: models.profile,
        required: true
      }],
      paranoid: false
    });
    if (!user) throw new Error('User not found');
    if (user.deletedAt) throwErrorWithCode(user.deletedAt.getTime(), errors.USER_DELETED);

    const isValidPassword = await user.isValidPassword(password);
    if (!isValidPassword) throw new Error('User not found');

    return user;
  }

  static async createTokenForUser (user) {
    return jwt.encode(
      { id: user.id },
      process.env.JWT_SECRET,
      config.auth.tokenLifetimeSeconds);
  }

  static async createOauthTokenForUser (user) {
    return jwt.encode(
      { id: user.id },
      process.env.JWT_OAUTH_SECRET,
      5 * 60);
  }

  static async createOauthUser ({
    id = required(),
    accessToken = required(),
    refreshToken,
    profile = required(),
    type = required()
  } = {}) {
    let model;
    let email;
    let firstName;
    let lastName;
    if (type === 'google') {
      model = models.googleUser;
      email = profile.email ?? (id + '@gmail.com');
      firstName = profile.given_name;
      lastName = profile.family_name;
    } else if (type === 'facebook') {
      model = models.facebookUser;
      email = profile.email ?? (id + '@facebook.com');
      firstName = profile.first_name;
      lastName = profile.last_name;
    }
    if (!model) throw new Error('Type unknown');

    const [social, created] = await model.findOrCreate({
      where: {
        id: id
      },
      defaults: {
        id: id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
      }
    });

    if (!created) {
      const user = await models.user.findByPk(social.userId);
      if (user) return user;
    }
    let user = await models.user.findOne({
      where: {
        email: email.toLowerCase()
      }
    });
    if (!user) {
      user = await this.createUser({
        email: email,
        password: v1(),
        lastName: lastName,
        firstName: firstName
      });
    }

    social.userId = user.id;
    await social.save();
    return user;
  }

  static async createUser ({
    email = required(),
    password = required(),
    firstName,
    lastName,
    color,
    isPassword = true
  } = {}) {
    return seq.transaction(async t => {
      return this._create({
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        color: color,
        isPassword: isPassword,
        role: 'user',
        t: t
      });
    });
  }

  static async recoverPassword (userEmail) {
    const userModel = models.user;
    const user = await userModel.findOne({
      where: {
        email: userEmail.toLowerCase()
      },
      include: [{
        model: models.profile
      }],
      paranoid: false
    });
    if (!user) throw new Error('User not found');

    const expire = Date.now() + config.auth.passwordResetEmailMaxAge;
    const email = user.email;
    const secret = process.env.HMAC_SECRET;
    const signature = hmac.encode(secret, 'password' + email + expire);

    const url = buildUrl(config.proto + '://' + config.frontendDomain, {
      path: config.auth.passwordResetEmailRedirect,
      queryParams: {
        email: email,
        expire: expire,
        signature: signature
      }
    });

    sendgrid.send({
      apiKey: process.env.SENDGRID_API_KEY,
      to: email,
      from: config.auth.passwordResetEmailFrom,
      subject: config.auth.passwordResetEmailSubject,
      templateId: config.auth.passwordResetEmailTemplateId,
      params: {
        url: url,
        name: user.profile.firstName
      }
    });
  }

  static async resetPassword ({
    email = required(),
    expire = required(),
    signature = required(),
    password = required()
  } = {}) {
    const userModel = models.user;
    const user = await userModel.findOne({
      where: {
        email: email.toLowerCase()
      },
      paranoid: false
    });
    if (!user) throw new Error('User not found');

    const secret = process.env.HMAC_SECRET;
    const str = 'password' + email + expire;
    const isValid = hmac.isValid(secret, signature, str);
    if (!isValid) throw new Error('Signature is not valid');

    if (expire < Date.now()) throw new Error('Expired');

    user.password = password;
    await user.save();

    return user;
  }

  static async changePassword ({
    newPassword = required(),
    oldPassword = required(),
    user = required()
  } = {}) {
    if (user.isPassword) {
      const valid = await user.isValidPassword(oldPassword);
      if (!valid) throw new Error('Old password not valid');
      user.password = newPassword;
      await user.save();
    } else {
      user.isPassword = true;
      user.password = newPassword;
      await user.save();
    }
  }

  static async restore ({
    email = required(),
    password = required()
  } = {}) {
    const user = await models.user.findOne({
      where: {
        email: email.toLowerCase(),
        deletedAt: {
          [Op.not]: null
        }
      },
      paranoid: false
    });

    if (!user) throw new Error('User not found');

    const isValid = await user.isValidPassword(password);
    if (!isValid) throw new Error('User not found');

    user.setDataValue('deletedAt', null);
    await user.save();

    return await this.createTokenForUser(user);
  }

  static async delete ({
    userId = required(),
    isRestore
  } = {}) {
    if (isRestore) {
      await models.user.destroy({
        where: {
          id: userId
        }
      });

      return;
    }

    await this._deleteAll({
      userId
    });
  }

  static async _deleteAll ({
    userId = required()
  } = {}) {
    const teamMember = await models.teamMember.findOne({
      where: {
        userId
      }
    });

    try {
      await StripeService.cancelSubscription({
        teamId: teamMember.teamId
      });
    } catch (err) {
      console.log(err);
    }

    await models.user.destroy({
      where: {
        id: userId
      },
      force: true,
      paranoid: false
    });
  }

  static async _create ({
    email = required(),
    password = required(),
    role = required(),
    firstName,
    lastName,
    color,
    isPassword = true,
    isClient = false,
    t = required()
  } = {}) {
    const model = models.user;
    const roleModel = models.role;
    const profileModel = models.profile;

    const prev = await model.findOne({
      transaction: t,
      where: {
        email: email.toLowerCase()
      },
      include: {
        model: profileModel
      },
      paranoid: false
    });

    if (prev?.deletedAt) throwErrorWithCode(prev.deletedAt.getTime(), errors.USER_DELETED);
    if (prev) throwErrorWithCode('Email already used', errors.EMAIL_USED);

    const r = await roleModel.findOne({
      attributes: ['id'],
      where: {
        name: role
      },
      transaction: t
    });
    if (!r) throwErrorWithCode('No role');

    const user = await model.create({
      email: email,
      password: password,
      roleId: r.id,
      isPassword: isPassword,
      isClient
    }, { transaction: t });

    await BookService.createCalendarBook(user.id, t);

    const userName = await this._getUserName({
      userId: user.id,
      firstName,
      lastName,
      transaction: t
    });

    const profile = await profileModel.create({
      lastName: lastName,
      firstName: firstName,
      userName: userName,
      color: color,
      userId: user.id
    }, { transaction: t });

    await models.sidebarTool.create({
      userId: user.id
    }, {
      transaction: t
    });

    await OnboardingRepo.create({
      userId: user.id
    }, {
      transaction: t
    });

    await ReminderRepo.createReminderSettings(user.id, t);

    user.profile = profile;
    user.role = r;

    await models.settings.create({
      userId: user.id
    }, {
      transaction: t
    });

    const taskFilter = '{"showCompletedFilter":{"label":"None","val":3},"search":"","membersFilter":null, "selectedBooksFilter": null,"tagsFilter":[],"urgencyFilter":[],"dateFilter":[],"showOnTask":[{"name":"Labels","key":"labels","width":56.45,"selected":true},{"name":"Assignee","key":"assignee","width":70.47,"selected":true},{"name":"Priority","key":"priority","width":59.92,"selected":true},{"name":"Due date","key":"dueDate","width":73,"selected":true},{"name":"Comments","key":"comments","width":79.08,"selected":true},{"name":"Attachments","key":"attachments","width":89.28,"selected":false,"isHidden":true},{"name":"Description","key":"description","width":82,"selected":false,"isHidden":true},{"name":"Subtitle","key":"subtitle","width":62.75,"selected":true},{"name":"Image","key":"image","width":52.52,"selected":true},{"name":"Estimate","key":"storyPoints","width":66,"selected":true}],"sortedBy":"Due date","groupBy":"Date"}';
    await FilterRepo.create({ userId: user.id, transaction: t, name: 'Today', taskFilter });

    return user;
  }

  static async _getUserName ({
    firstName,
    lastName,
    userId,
    transaction = required()
  } = {}) {
    if (firstName && lastName) {
      let userName = (firstName + lastName).toLowerCase();
      const p = await models.profile.findOne({
        where: {
          userName
        },
        transaction: transaction
      });
      if (p) userName = userName + userId;
      return userName;
    } else {
      return 'user' + userId;
    }
  }

  static async _getByToken (secret, token) {
    const data = await jwt.decode(token, secret);
    const id = data.id;
    const user = await models.user.findOne({
      where: {
        id: id
      },
      include: [
        {
          model: models.role,
          required: true
        },
        {
          model: models.profile,
          required: true
        }, {
          model: models.avatar,
          attributes: ['url']
        },
        {
          model: models.onboarding
        }
      ]
    });
    if (!user) throw new Error('User not found');

    return user;
  }

  static async uploadAvatar ({
    name = required(),
    size = required(),
    mimeType = required(),
    body = required(),
    userId = required()
  } = {}) {
    const avatar = await models.avatar.findOne({
      where: {
        userId: userId
      }
    });

    if (avatar) {
      avatar.destroy({
        force: true
      });

      await s3.delete({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        keys: [{ Key: avatar.key }]
      });
    };

    const key = `avatars/${userId}/${name}`;

    const upload = await s3.upload({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      mimeType: mimeType,
      key: key,
      body: body
    });

    const attachment = await models.avatar.create({
      userId: userId,
      size: size,
      mimeType: mimeType,
      url: upload.Location,
      key: key
    });

    return {
      url: upload.Location,
      id: attachment.id
    };
  }

  static async getQuickThoughts (userId = required()) {
    return await UserRepo.getQuickThoughts(userId);
  }

  static async updateQuickThoughts (userId = required(), text) {
    return UserRepo.updateQuickThoughts(userId, text);
  }
}

module.exports = UserService;
