'use strict';

const { Op } = require('sequelize');
const buildUrl = require('build-url');
const { customAlphabet } = require('nanoid');
const alphabet = require('nanoid-dictionary/lowercase');

const config = require('../config');
const errors = require('../errors');
const models = require('../models');
const { hmac, sendgrid, loops, s3, elasticsearch } = require('../libs');
const { throwErrorWithCode, required } = require('../utils');
const { sequelize: { sequelize: seq } } = require('../loaders');

const UserService = require('./UserService');
const PlanService = require('./PlanService');
const StripeService = require('./StripeService');
const NotificationService = require('./NotificationService');

const TeamLogoRepo = require('../repos/TeamLogoRepo');
const OnboardingTaskSettingRepo = require('../repos/OnboardingTaskSettingRepo');

const NotificationCodes = require('../core/NotificationCodes.js');
const ActivityProducerService = require('./ActivityProducerService');
const moment = require('moment');
const SubscriptionRepo = require('../repos/SubscriptionRepo.js');

const createLink = customAlphabet(alphabet, 10);
const env = process.env.NODE_ENV;
class TeamService {
  static async getTeamByUserId ({
    userId = required()
  } = {}) {
    const teamMember = await models.teamMember.findOne({
      where: {
        userId: userId
      },
      include: [
        {
          model: models.team,
          include: [
            {
              model: models.teamLogo,
              required: false,
              attributes: ['url', 'id']
            }
          ]
        }
      ]
    });

    return {
      team: teamMember?.team
    };
  }

  static async getTeamById (id) {
    return models.team.findByPk(id);
  }

  static async getTeamMember ({
    userId = required(),
    teamId = required()
  }) {
    const member = await models.teamMember.findOne({
      where: {
        userId: userId,
        teamId: teamId
      },
      include: [
        {
          model: models.user,
          attributes: ['id', 'email'],
          include: [{
            model: models.profile
          }, {
            model: models.avatar,
            attributes: ['url']
          }]
        },
        { model: models.teamRole }
      ]
    });

    if (!member) throw new Error('Member not found');

    return {
      id: member.id,
      user: member.user,
      userId: member.user.id,
      email: member.user.email,
      firstName: member.user.profile.firstName,
      lastName: member.user.profile.lastName,
      color: member.user.profile.color,
      location: member.user.profile.location,
      timezone: member.user.profile.timezone,
      position: member.user.profile.position,
      books: [],
      role: member.teamRole.name,
      teamRole: member.teamRole,
      hasBillingAccess: member.hasBillingAccess,
      avatar: member.user.avatar
    };
  }

  static async getTeamBooks ({
    userId = required(),
    teamId = required()
  } = {}) {
    const accessesWithBooks = await models.teamAccess.findAll({
      where: {
        mode: 'write',
        userId: userId,
        teamId: teamId,
        bookId: {
          [Op.ne]: null
        },
        projectId: null
      },
      attributes: [],
      include: [{
        model: models.book,
        required: true,
        where: {
          isSection: false,
          bookFolderId: null
        },
        attributes: [
          'id',
          'title',
          'subTitle',
          'color',
          'isSection',
          'isSample',
          'archivedAt',
          'favorite',
          'icon',
          'createdAt',
          'updatedAt',
          'bookFolderId'
        ],
        include: [
          {
            model: models.bookOrder,
            attributes: ['order', 'createdAt'],
            where: {
              userId: userId
            },
            required: false
          },
          {
            model: models.teamAccess,
            as: 'memberTeamAccesses',
            required: false,
            where: {
              mode: 'write',
              teamId: teamId,
              projectId: null
            },
            attributes: ['id'],
            include: {
              model: models.user,
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: models.profile
                },
                {
                  model: models.teamMember
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }
              ]
            }
          },
          {
            model: models.teamAccess,
            required: false,
            as: 'clientTeamAccesses',
            where: {
              mode: 'read',
              teamId: teamId
            },
            attributes: ['id'],
            include: {
              model: models.user,
              attributes: ['id', 'email'],
              required: true,
              include: [
                {
                  model: models.profile
                },
                { model: models.avatar }
              ]
            }
          }
        ]
      }]
    });

    return accessesWithBooks.map((accessesWithBook) => {
      const {
        id,
        title,
        subTitle,
        color,
        isSection,
        isSample,
        archivedAt,
        favorite,
        icon,
        createdAt,
        updatedAt,
        projects,
        bookFolderId,
        bookOrder,
        memberTeamAccesses,
        clientTeamAccesses
      } = accessesWithBook.book.get();

      return {
        id,
        title,
        subTitle,
        color,
        isSection,
        isSample,
        archivedAt,
        favorite,
        icon,
        bookFolderId,
        createdAt,
        updatedAt,
        bookOrder,
        projects,
        shareWith: memberTeamAccesses.map((memberTeamAccess) => ({
          ...memberTeamAccess.user.profile.dataValues,
          id: memberTeamAccess.user.teamMember?.id,
          userId: memberTeamAccess.user.id,
          avatar: memberTeamAccess.user.avatar
        })),
        clients: clientTeamAccesses.map((clientTeamAccess) => clientTeamAccess)
      };
    });
  }

  static async getCalendarBook ({ userId = required() } = {}) {
    const calendarSpace = await models.book.findOne({
      where: {
        userId,
        isCalendar: true
      }
    });

    return calendarSpace.get();
  }

  static async getAccessForBook ({
    userId = required(),
    teamId = required(),
    bookId = required(),
    onlyEdit = false
  } = {}) {
    const data = {};
    if (onlyEdit) data.mode = 'write';

    const teamAccess = await models.teamAccess.findOne({
      where: {
        ...data,
        userId: userId,
        teamId: teamId,
        bookId: bookId,
        projectId: null
      },
      paranoid: false
    });

    if (!teamAccess) throw new Error('Permission denied');
  }

  static async getAccessForProject ({
    userId = required(),
    teamId = required(),
    projectId = required()
  } = {}) {
    const project = await models.project.findByPk(projectId, {
      paranoid: false
    });

    if (!project) throw new Error('Project not found');

    const teamAccess = await models.teamAccess.findOne({
      where: {
        mode: 'write',
        userId: userId,
        teamId: teamId,
        bookId: project.bookId
      },
      paranoid: false
    });

    if (!teamAccess) throw new Error('Permission denied');
  }

  static async checkEmail ({ email = required() } = {}) {
    return seq.transaction(async t => {
      const invites = await models.temporaryMember.findAll({
        where: {
          email: email.toLowerCase()
        },
        transaction: t
      });

      const user = await models.user.findOne({
        where: {
          email: email.toLowerCase()
        },
        include: {
          model: models.profile
        },
        transaction: t
      });

      let member;

      if (user) {
        member = await models.teamMember.findOne({
          where: {
            userId: user.id
          },
          transaction: t
        });
      }

      return {
        hasTeamAccount: !!member,
        hasInvite: invites.length > 0
      };
    });
  }

  static async sendVerificationCode ({
    email = required()
  } = {}) {
    const code = Math.floor(100000 + Math.random() * 900000);
    const expireAt = Date.now() + config.team.codeMaxAge;

    await models.teamVerification.create({
      email: email.toLowerCase(),
      expireAt: expireAt,
      code: code
    });

    await sendgrid.send({
      apiKey: process.env.SENDGRID_API_KEY,
      to: email.toLowerCase(),
      from: config.team.emailFrom,
      subject: config.team.emailSubject,
      templateId: config.team.codeVerificationEmailTemplateId,
      params: {
        code: code,
        email: email.toLowerCase()
      }
    });
  }

  static async verifyCode ({
    email = required(),
    code = required()
  } = {}) {
    // Mock data for tests
    if (code === 100000) {
      throwErrorWithCode('Your code is incorrect', errors.VERIFICATION_CODE_INCORRECT);
    }

    if (code === 111111) {
      return;
    }

    const verification = await models.teamVerification.findAll({
      limit: 1,
      where: {
        email: email.toLowerCase()
      },
      order: [['createdAt', 'DESC']]
    });

    if (verification[0].code !== code) {
      throwErrorWithCode('Your code is incorrect', errors.VERIFICATION_CODE_INCORRECT);
    } else if (verification[0].expireAt < Date.now()) {
      throwErrorWithCode('Your code has expired', errors.VERIFICATION_CODE_EXPIRED);
    }
  }

  static async getAllMembers ({
    teamId = required(),
    orderColumn,
    orderDirection = 'ASC',
    limit,
    page,
    search
  }) {
    const offset = limit * page; // TODO: move to pagination middleware

    let where = { teamId: teamId };

    const map = {
      name: [
        [{ model: models.user }, { model: models.profile }, 'firstName', orderDirection],
        [{ model: models.user }, { model: models.profile }, 'lastName', orderDirection]
      ],
      role: [
        [{ model: models.teamRole }, 'name', orderDirection]
      ],
      spaces: []
    };

    if (!['ASC', 'DESC'].includes(orderDirection)) throw new Error('Invalid order direction');
    if (!Object.keys(map).includes(orderColumn)) throw new Error('Invalid order name');

    const order = map[orderColumn];

    // TODO: change this for performance improvements
    if (search) {
      where = {
        teamId: teamId,
        [Op.or]: [
          { '$user.email$': { [Op.iLike]: '%' + search + '%' } },
          { '$user.profile.first_name$': { [Op.iLike]: '%' + search + '%' } },
          { '$user.profile.last_name$': { [Op.iLike]: '%' + search + '%' } }
        ]
      };
    }

    let options = {};

    if (orderColumn !== 'spaces') {
      options = {
        offset: offset,
        limit: limit,
        order: order
      };
    }

    const members = await models.teamMember.findAndCountAll({
      where: where,
      include: [
        {
          model: models.user,
          attributes: ['id', 'email'],
          include: [{
            model: models.profile
          }, {
            model: models.avatar,
            attributes: ['url']
          }]
        },
        { model: models.teamRole }
      ],
      ...options
    });

    let result = [];

    for (const member of members.rows) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          teamId: teamId,
          userId: member.user.id,
          bookId: { [Op.ne]: null },
          projectId: null
        },
        include: [
          {
            model: models.book,
            where: {
              isSection: false
            }
          }
        ]
      });

      const books = teamAccess.map(t => t.book);
      const uniqueBooks = [...new Map(books.map(item => [item.id, item])).values()];

      result.push({
        id: member.id,
        userId: member.user.id,
        email: member.user.email,
        firstName: member.user.profile.firstName,
        lastName: member.user.profile.lastName,
        color: member.user.profile.color,
        location: member.user.profile.location,
        timezone: member.user.profile.timezone,
        position: member.user.profile.position,
        books: uniqueBooks,
        role: member.teamRole.name,
        hasBillingAccess: member.hasBillingAccess,
        avatar: member.user.avatar
      });
    }

    if (orderColumn === 'spaces') {
      result.sort((a, b) => {
        if (a.books.length > b.books.length) return orderDirection === 'ASC' ? 1 : -1;
        if (a.books.length < b.books.length) return orderDirection === 'ASC' ? -1 : 1;
        return 0;
      });

      result = result.slice(offset, offset + limit);
    }

    return {
      members: result,
      totalMembers: members.count
    };
  }

  static async getTemporaryMembers ({
    teamId = required(),
    search
  } = {}) {
    const where = { teamId: teamId };

    if (search) {
      where.email = { [Op.like]: '%' + search + '%' };
    }

    const result = await models.temporaryMember.findAndCountAll({
      where: where,
      attributes: ['id', 'email'],
      include: [{
        model: models.teamRole,
        attributes: ['name']
      }]
    });

    return {
      temporaryMembers: result.rows,
      totalMembers: result.count
    };
  }

  static async _createTeamMember ({
    userId = required(),
    teamId = required(),
    role = required(),
    t
  }) {
    const member = await models.teamMember.findOne({
      where: {
        userId,
        teamId
      },
      include: {
        model: models.user,
        attributes: ['email'],
        include: {
          model: models.profile,
          attributes: [
            'firstName',
            'lastName'
          ]
        }
      },
      transaction: t
    });

    if (member) throw new Error('Email already used');

    const r = await models.teamRole.findOne({
      attributes: ['id'],
      where: {
        name: role
      },
      transaction: t
    });

    if (!r) {
      throwErrorWithCode('No role');
    }

    const hasBillingAccess = role === 'admin';

    const createdMember = await models.teamMember.create({
      userId: userId,
      teamId: teamId,
      teamRoleId: r.id,
      hasBillingAccess: hasBillingAccess
    }, {
      transaction: t
    });

    const createdMemberData = await models.teamMember.findOne({
      where: {
        id: createdMember.id
      },
      include: {
        model: models.user,
        attributes: ['email'],
        include: {
          model: models.profile,
          attributes: [
            'firstName',
            'lastName'
          ]
        }
      },
      transaction: t
    });

    elasticsearch.updateById({
      id: createdMemberData.id,
      obj: {
        email: createdMemberData.user?.email,
        firstName: createdMemberData.user?.profile?.firstName,
        lastName: createdMemberData.user?.profile?.lastName
      },
      modelName: 'member',
      upsert: true
    }).catch(error => {
      console.error(error);
    });

    await models.inbox.create({
      userId: userId,
      teamId: teamId
    },
    {
      transaction: t
    });
  }

  static async register ({
    teamName = required(),
    inviteLink,
    email = required(),
    password = required(),
    firstName = required(),
    lastName = required(),
    color,
    size
  }) {
    const result = await seq.transaction(async t => {
      const user = await UserService._create({
        email: email,
        password: password,
        role: 'user',
        firstName: firstName,
        lastName: lastName,
        color,
        t: t
      });

      const team = await this._create({
        userId: user.id,
        teamName: teamName,
        inviteLink: inviteLink,
        t: t,
        size
      });

      return {
        team: team,
        user: user
      };
    });

    if (env === 'production') {
      sendgrid.addContact({
        firstName: firstName,
        lastName: lastName,
        userName: result.user.profile.userName,
        email: email,
        customFields: {
          e4_T: teamName
        },
        listIds: [process.env.SENDGRID_TEAM_SIGN_UP_LIST_ID]
      }).catch(e => {
        console.log(e);
      });

      loops.addContact({
        firstName: firstName,
        lastName: lastName,
        userName: result.user.profile.userName,
        email: email,
        teamName,
        userGroup: 'sign-up'
      }).catch(e => {
        console.log(e);
      });
    }

    return result;
  }

  static async createTeam ({
    teamName = required(),
    inviteLink,
    userId = required(),
    size
  } = {}) {
    return seq.transaction(async t => {
      return this._create({
        teamName: teamName,
        inviteLink: inviteLink,
        userId: userId,
        t: t,
        size
      });
    });
  }

  static async _create ({
    teamName = required(),
    inviteLink,
    userId = required(),
    t = required(),
    size = null
  } = {}) {
    const old = await models.team.findOne({
      where: {
        userId: userId
      }
    });

    if (old) throw new Error('This user already has a team');

    const link = await this._getTeamLink({
      teamName: teamName,
      userId: userId,
      transaction: t
    });

    const team = await models.team.create({
      inviteLink: inviteLink,
      name: teamName,
      userId: userId,
      link: link,
      size
    }, {
      transaction: t
    });

    const plan = await models.plan.findOne({
      transaction: t,
      where: {
        name: 'Trial Plan'
      }
    });

    if (!plan) {
      throwErrorWithCode('No team plan');
    }

    const expireAt = moment().add(config.trialDuration, 'd');
    await SubscriptionRepo.createSubscription({
      planId: plan.id,
      teamId: team.id,
      data: {},
      expireAt
    }, t);

    await this._createTeamMember({
      userId: userId,
      teamId: team.id,
      role: 'admin',
      t: t
    });

    await OnboardingTaskSettingRepo.create({
      teamId: team.id
    }, {
      transaction: t
    });

    const user = await models.user.findOne({
      where: {
        id: userId
      },
      include: [{
        model: models.profile,
        required: true
      }]
    });

    if (user) {
      if (env === 'production') {
        sendgrid.addContact({
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          userName: user.profile.userName,
          email: user.email,
          listIds: [process.env.SENDGRID_TEAM_SIGN_UP_LIST_ID],
          customFields: {
            e4_T: teamName
          }
        }).catch(e => {
          console.log(e);
        });

        loops.addContact({
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          userName: user.profile.userName,
          email: user.email,
          userGroup: 'sign-up',
          teamName
        }).catch(e => {
          console.log(e);
        });
      }
    }

    return team;
  }

  static async _getTeamLink ({
    teamName = required(),
    userId = required(),
    transaction = required()
  } = {}) {
    let teamLink = teamName.trim().replace(/\s/g, '-');

    const t = await models.team.findOne({
      where: {
        link: teamLink.toLowerCase()
      },
      transaction: transaction
    });

    if (t) teamLink = teamName + userId;

    return teamLink.toLowerCase();
  }

  static async inviteMembers ({
    emails = required(),
    teamId = required(),
    bookIds
  }) {
    for (const email of emails) {
      const user = await models.user.findOne({
        where: {
          email: email.toLowerCase()
        },
        include: [{
          model: models.profile
        }]
      });

      if (user) {
        const teamMember = await models.teamMember.findOne({
          where: {
            userId: user.id
          }
        });

        if (teamMember) throw new Error(`${user.email} already has team!`);
      }

      const team = await models.team.findByPk(teamId);

      if (!team) throw new Error('Team not found');

      const tempMember = await models.temporaryMember.findOne({
        where: {
          email: email,
          teamId: teamId
        }
      });

      if (tempMember) throw new Error(`${email} already has invite to this team`);

      const role = await models.teamRole.findOne({
        where: {
          name: 'user'
        }
      });

      if (!role) throw new Error('Role not found');

      const data = {
        email: email,
        teamId: teamId,
        teamRoleId: role.id
      };

      if (bookIds?.length > 0) {
        const teamAccess = await models.teamAccess.findAll({
          where: {
            teamId,
            bookId: bookIds
          }
        });

        const allowedBookIds = teamAccess.map(item => item.bookId);
        const uniqueBookIds = [...new Set(allowedBookIds)];

        data.bookIds = uniqueBookIds.join(',');
      }

      await models.temporaryMember.create(data);

      const expire = Date.now() + config.team.inviteMemberEmailMaxAge;
      const secret = process.env.HMAC_SECRET;
      const signature = hmac.encode(secret, 'invite' + email + teamId + expire);

      const url = buildUrl(config.proto + '://' + config.frontendDomain, {
        path: config.team.inviteMemberEmailRedirect,
        queryParams: {
          invite: 'true',
          email: email,
          teamId: teamId,
          teamName: team.name,
          expire: expire,
          signature: signature
        }
      });

      sendgrid.send({
        apiKey: process.env.SENDGRID_API_KEY,
        to: email.toLowerCase(),
        from: config.team.emailFrom,
        subject: config.team.inviteMemberEmailSubject,
        templateId: config.team.inviteMemberEmailTemplateId,
        params: {
          email: user?.profile?.firstName || email.toLowerCase(),
          name: team.name,
          url: url
        }
      });
    }
  }

  static async createInviteLink () {
    const link = createLink();

    const team = await models.team.findOne({
      where: {
        inviteLink: link
      }
    });

    if (team) {
      return this.createInviteLink(link);
    } else {
      return link;
    }
  }

  static async getTeamByInviteLink ({
    inviteLink = required()
  } = {}) {
    const team = await models.team.findOne({
      where: {
        inviteLink: inviteLink
      }
    });

    if (!team) throw new Error('Team not found');

    return team.get();
  }

  static async _accept ({
    userId = required(),
    teamId = required(),
    email = required(),
    expire,
    signature,
    inviteLink,
    t = required()
  } = {}) {
    const team = await models.team.findByPk(teamId);

    if (!team || (inviteLink && inviteLink !== team.inviteLink)) throw new Error('Team not found');

    await PlanService.checkMembers(userId, teamId);

    const teamMember = await models.teamMember.findOne({
      where: {
        userId: userId,
        teamId: teamId
      },
      transaction: t
    });

    if (teamMember) throw new Error('You have already accepted this invitation');

    let role = 'user';

    if (expire && signature) {
      const temporaryMember = await models.temporaryMember.findOne({
        where: {
          teamId: teamId,
          email: email.toLowerCase()
        },
        include: [{
          model: models.teamRole,
          required: false,
          attributes: ['name']
        }],
        transaction: t
      });

      if (!temporaryMember) throw new Error('Invite not found');

      role = temporaryMember.teamRole.name || 'user';

      const secret = process.env.HMAC_SECRET;
      const str = 'invite' + email + teamId + expire;
      const isValid = hmac.isValid(secret, signature, str);
      if (!isValid) throw new Error('Signature is not valid');
      // if (expire < Date.now()) throw new Error('Invite has expired');

      if (temporaryMember.bookIds) {
        const bookIds = temporaryMember.bookIds.split(',');

        for (const bookId of bookIds) {
          await models.teamAccess.create({
            mode: 'write',
            userId: userId,
            teamId: team.id,
            bookId: parseInt(bookId)
          }, {
            transaction: t
          });
        }
      }

      await temporaryMember.destroy({ transaction: t });
    }

    await this._createTeamMember({
      userId: userId,
      teamId: team.id,
      role: role,
      t: t
    });

    return team;
  }

  static async acceptInviteAndCreateUser ({
    signature,
    expire,
    inviteLink,
    email = required(),
    teamId = required(),
    password = required(),
    firstName = required(),
    lastName = required(),
    color
  }) {
    const result = await seq.transaction(async t => {
      let user = await models.user.findOne({
        where: {
          email: email
        },
        transaction: t
      });

      if (!user) {
        user = await UserService._create({
          email: email,
          password: password,
          role: 'user',
          firstName: firstName,
          lastName: lastName,
          color,
          t: t
        });
      }

      const team = await this._accept({
        userId: user.id,
        teamId: teamId,
        email: email,
        expire: expire,
        signature: signature,
        inviteLink: inviteLink,
        t: t
      });

      return {
        team: team,
        user: user
      };
    });

    await StripeService.updateSubscription({ teamId });

    if (env === 'production') {
      sendgrid.addContact({
        firstName: firstName,
        lastName: lastName,
        userName: result.user.profile.userName,
        email: email,
        listIds: [process.env.SENDGRID_INVITED_LIST_ID],
        customFields: {
          e4_T: result.team.name
        }
      }).catch(e => {
        console.log(e);
      });

      loops.addContact({
        firstName: firstName,
        lastName: lastName,
        userName: result.user.profile.userName,
        email: email,
        userGroup: 'invited',
        teamName: result.team.name
      }).catch(e => {
        console.log(e);
      });
    }

    return result;
  }

  static async acceptInvite ({
    userId = required(),
    teamId = required(),
    email = required(),
    signature,
    expire,
    inviteLink
  }) {
    const result = await seq.transaction(async t => {
      return await this._accept({
        userId: userId,
        teamId: teamId,
        email: email,
        signature: signature,
        expire: expire,
        inviteLink: inviteLink,
        t: t
      });
    });

    await StripeService.updateSubscription({ teamId });

    return result;
  }

  static async deleteMemberFromBook ({
    memberId = required(),
    userId = required(),
    teamId = required(),
    bookId = required()
  } = {}) {
    const member = await models.teamMember.findByPk(memberId);

    if (!member) {
      throw new Error('Member not found');
    }

    const deletedCount = await models.teamAccess.destroy({
      where: {
        userId: member.userId,
        teamId: teamId,
        bookId: bookId
      },
      force: true,
      paranoid: false
    });

    if (deletedCount) {
      await ActivityProducerService.sendMessage({
        from: {
          id: bookId,
          relatedUserId: member.userId
        },
        to: {
          id: bookId,
          relatedUserId: null
        },
        creatorId: userId,
        type: 'book',
        entity: 'book'
      });
      await NotificationService.createNotification({
        userId,
        teamId,
        bookId,
        title: NotificationCodes.BOOK_MEMBER_REMOVE
      });

      // TODO onesignal
    }
  }

  static async deleteMember ({
    memberId = required(),
    teamId = required()
  } = {}) {
    await seq.transaction(async t => {
      const member = await models.teamMember.findByPk(memberId, { transaction: t });

      if (!member) throw new Error('Member not found');

      await models.teamAccess.destroy({
        where: {
          userId: member.userId,
          teamId: teamId
        },
        force: true,
        paranoid: false,
        transaction: t
      });

      await models.teamMember.destroy({
        where: {
          id: memberId,
          teamId: teamId
        },
        transaction: t
      });
    });

    await StripeService.updateSubscription({ teamId });
  }

  static async deleteTemporaryMember ({
    memberId = required(),
    teamId = required()
  } = {}) {
    const count = await models.temporaryMember.destroy({
      where: {
        id: memberId,
        teamId: teamId
      }
    });

    if (!count) {
      throw new Error('Invite not found');
    }
  }

  static async updateMemberRole ({
    roleName = required(),
    memberId = required(),
    teamId = required(),
    userId = required()
  } = {}) {
    let success = false;
    const updatedUserId = await seq.transaction(async t => {
      const team = await models.team.findByPk(teamId, { transaction: t });

      const member = await models.teamMember.findOne({
        where: {
          id: memberId,
          teamId: teamId
        },
        transaction: t
      });

      if (!member) throw new Error('Member not found');

      // prevent change role for owner
      if (member.userId === team.userId) throw new Error('Permission denied');

      const user = await models.teamMember.findOne({
        where: {
          userId: userId,
          teamId: teamId
        },
        include: [{
          model: models.teamRole,
          required: true
        }]
      });

      // super user cannot set admin role
      if (user.teamRole.name === 'super user' && roleName === 'admin') throw new Error('Permission denied');

      const role = await models.teamRole.findOne({
        where: {
          name: roleName
        },
        transaction: t
      });

      if (!role) throw new Error('Role not found');

      const obj = {
        teamRoleId: role.id
      };

      // admin automatically get billing access
      if (roleName === 'admin') {
        obj.hasBillingAccess = true;
      }

      await member.update(obj, { transaction: t });
      success = true;

      return member.userId;
    });

    if (success) {
      await NotificationService.createNotification({
        userId,
        targetUserId: updatedUserId,
        teamId,
        title: NotificationCodes.ROLE_UPDATE,
        message: `Your workspace role changed to "${roleName}"`
      });
    }
  }

  static async updateTemporaryMemberRole ({
    roleName = required(),
    memberId = required(),
    teamId = required(),
    userId = required()
  } = {}) {
    return seq.transaction(async t => {
      const user = await models.teamMember.findOne({
        where: {
          userId: userId,
          teamId: teamId
        },
        include: [{
          model: models.teamRole,
          required: true
        }]
      });

      // super user cannot set admin role
      if (user.teamRole.name === 'super user' && roleName === 'admin') throw new Error('Permission denied');

      const role = await models.teamRole.findOne({
        where: {
          name: roleName
        },
        transaction: t
      });

      if (!role) throw new Error('Role not found');

      const count = await models.temporaryMember.update({
        teamRoleId: role.id
      }, {
        where: {
          id: memberId,
          teamId: teamId
        },
        transaction: t
      });

      if (count[0] === 0) throw new Error('Member not found');
    });
  }

  static async updateBillingAccess ({
    hasBillingAccess = required(),
    memberId = required(),
    teamId = required()
  } = {}) {
    if (!hasBillingAccess) {
      const member = await models.teamMember.findOne({
        where: {
          id: memberId,
          teamId: teamId
        },
        include: [{
          model: models.teamRole,
          required: true
        }]
      });

      if (member?.teamRole.name === 'admin') throw new Error('Permission denied');
    }

    const [count, updatedTeamMembers] = await models.teamMember.update({
      hasBillingAccess: hasBillingAccess
    },
    {
      where: {
        id: memberId,
        teamId: teamId
      },
      returning: true
    });

    if (!count) {
      throw new Error('Member not found');
    }

    if (hasBillingAccess) {
      await NotificationService.createNotification({
        userId: updatedTeamMembers[0].userId,
        teamId,
        title: NotificationCodes.HAS_BILLING_ACCESS,
        message: 'You can now access the billing settings for the workspace'
      });
    }
  }

  static async uploadLogo ({
    teamId = required(),
    name = required(),
    size = required(),
    mimeType = required(),
    body = required(),
    userId = required()
  } = {}) {
    const logo = await models.teamLogo.findOne({
      where: {
        userId: userId,
        teamId: teamId
      }
    });

    if (logo) {
      await this._deleteTeamLogos({
        userId: userId,
        teamId: teamId
      });
    };

    const key = `${userId}/${teamId}/${name}`;

    const upload = await s3.upload({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      mimeType: mimeType,
      key: key,
      body: body
    });

    const attachment = await models.teamLogo.create({
      userId: userId,
      teamId: teamId,
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

  static async deleteLogo ({
    teamId = required()
  }) {
    const logo = await TeamLogoRepo.getByTeamId(teamId);

    if (!logo) {
      throw new Error('Logo not found');
    }

    const success = await TeamLogoRepo.deleteByTeamId(teamId);

    if (!success) {
      throw new Error('Logo not deleted');
    }

    await s3.delete({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      keys: [{ Key: logo.key }]
    });
  }

  static async _deleteTeamLogos ({
    userId = required(),
    teamId = required()
  } = {}) {
    let logos = [];

    await seq.transaction(async t => {
      logos = await models.teamLogo.findAll({
        where: {
          userId,
          teamId
        },
        transaction: t
      });

      if (logos.length > 0) {
        await models.teamLogo.destroy({
          where: {
            userId: userId,
            teamId
          },
          force: true,
          paranoid: false,
          transaction: t
        });
      }
    });

    if (logos.length > 0) {
      const keys = logos.map(item => ({ Key: item.key }));

      await s3.delete({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        keys: keys
      });
    }
  };

  static async updateName ({
    name,
    userId,
    teamId
  } = {}) {
    return seq.transaction(async t => {
      const link = await this._getTeamLink({
        teamName: name,
        userId: userId,
        transaction: t
      });

      const data = { name, link };

      await models.team.update(data, {
        where: { id: teamId },
        transaction: t
      });

      return data;
    });
  }
};

module.exports = TeamService;
