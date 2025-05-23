'use strict';

const { sequelize: { sequelize: seq } } = require('../loaders');
const models = require('../models');
const { required } = require('../utils');
const UserService = require('./UserService');
const PlanService = require('./PlanService');
const config = require('../config');
const buildUrl = require('build-url');
const { hmac, sendgrid } = require('../libs');
const { Op } = require('sequelize');
const ActivityProducerService = require('./ActivityProducerService');

class ClientService {
  static async getTeamsAndBooks ({
    userId = required()
  } = {}) {
    const client = await models.client.findOne({
      where: {
        userId: userId
      }
    });

    if (!client) throw new Error('Client not found');

    const clientToTeams = await models.clientToTeam.findAll({
      where: {
        clientId: client.id
      },
      include: [{
        model: models.team,
        include: [
          {
            model: models.teamLogo,
            required: false,
            attributes: ['url', 'id']
          }
        ]
      }]
    });

    const teams = clientToTeams.map(c => c.team?.get());

    for (const [index, team] of teams.entries()) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          mode: 'read',
          userId: userId,
          teamId: team.id,
          bookId: {
            [Op.ne]: null
          },
          projectId: null
        },
        include: [{
          model: models.book,
          required: true,
          where: {
            isSection: false
          },
          include: [
            { model: models.project },
            {
              model: models.bookOrder,
              attributes: ['order', 'createdAt'],
              where: {
                userId: userId
              },
              required: false
            }
          ]
        }],
        order: [
          [{ model: models.book }, { model: models.bookOrder }, 'order'],
          [{ model: models.book }, { model: models.bookOrder }, 'createdAt'],
          [models.book, 'createdAt']
        ]
      });

      teams[index].books = teamAccess.map(t => t.book?.get());
    }

    return teams.filter(t => t.books.length > 0) || [];
  }

  static async inviteClients ({
    emails = required(),
    teamId = required(),
    userId = required(),
    bookIds
  }) {
    for (const email of emails) {
      const tempClient = await models.temporaryClient.findOne({
        where: {
          email: email,
          teamId: teamId
        }
      });

      if (tempClient) throw new Error(`${email} already has invite to this team`);

      const team = await models.team.findByPk(teamId);

      if (!team) throw new Error('Team not found');

      const user = await models.user.findOne({
        where: {
          email: email.toLowerCase()
        },
        include: [{
          model: models.profile
        }]
      });

      if (user && !user.isClient) throw new Error(`${email} already has an account and cannot be invited as a client`);

      if (user?.isClient) {
        const client = await models.client.findOne({
          where: {
            userId: user.id
          }
        });

        const clientToTeam = await models.clientToTeam.findOne({
          where: {
            clientId: client.id,
            teamId: teamId
          }
        });

        if (clientToTeam) throw new Error(`${email} already a client of this team`);
      }

      const secret = process.env.HMAC_SECRET;
      const signature = hmac.encode(secret, 'client-invite' + email + teamId);

      let url = '';

      if (user?.isClient) {
        url = buildUrl(config.proto + '://' + config.frontendDomain, {
          path: config.client.inviteClientEmailRedirectWithoutRegistration,
          queryParams: {
            email: email,
            teamId: teamId,
            signature: signature
          }
        });
      } else {
        url = buildUrl(config.proto + '://' + config.frontendDomain, {
          path: config.client.inviteClientEmailRedirectWithRegistration,
          queryParams: {
            'client-invite': 'true',
            email: email,
            teamId: teamId,
            teamName: team.name,
            signature: signature
          }
        });
      }

      const data = {
        email: email,
        teamId: teamId
      };

      if (bookIds?.length > 0) {
        const teamAccess = await models.teamAccess.findAll({
          where: {
            userId,
            mode: 'write',
            teamId,
            bookId: bookIds
          }
        });

        const allowedBookIds = teamAccess.map(item => item.bookId);
        const uniqueBookIds = [...new Set(allowedBookIds)];

        data.bookIds = uniqueBookIds.join(',');
      }

      await models.temporaryClient.create(data);

      await sendgrid.send({
        apiKey: process.env.SENDGRID_API_KEY,
        to: email.toLowerCase(),
        from: config.client.emailFrom,
        subject: config.client.inviteClientEmailSubject,
        templateId: config.client.inviteClientEmailTemplateId,
        params: {
          email: user?.profile?.firstName || email.toLowerCase(),
          name: team.name,
          url: url
        }
      });
    }
  }

  static async registerClient ({
    email = required(),
    password = required(),
    teamId = required(),
    signature = required(),
    firstName = required(),
    lastName = required(),
    color = required()
  } = {}) {
    return seq.transaction(async t => {
      const user = await UserService._create({
        email: email,
        password: password,
        role: 'user',
        firstName: firstName,
        lastName: lastName,
        isClient: true,
        color,
        t: t
      });

      const client = await models.client.create({
        userId: user.id
      }, {
        transaction: t
      });

      await this._acceptInvite({
        email,
        teamId,
        signature,
        clientId: client.id,
        userId: user.id,
        t
      });

      return user;
    });
  }

  static async acceptInviteClient ({
    email = required(),
    teamId = required(),
    signature = required(),
    userId = required()
  } = {}) {
    return seq.transaction(async t => {
      const client = await models.client.findOne({
        userId
      }, {
        transaction: t
      });

      return this._acceptInvite({
        email,
        teamId,
        signature,
        clientId: client.id,
        userId,
        t
      });
    });
  }

  static async _acceptInvite ({
    email = required(),
    teamId = required(),
    signature = required(),
    userId = required(),
    clientId = required(),
    t = required()
  } = {}) {
    const team = await models.team.findByPk(teamId, { transaction: t });

    if (!team) throw new Error('Team not found');

    await PlanService.checkClients(userId, teamId);

    const clientToTeam = await models.clientToTeam.findOne({
      where: {
        clientId,
        teamId
      },
      transaction: t
    });

    if (clientToTeam) throw new Error('You have already accepted this invitation');

    if (signature) {
      const temporaryClient = await models.temporaryClient.findOne({
        where: {
          teamId: teamId,
          email: email.toLowerCase()
        },
        transaction: t
      });

      if (!temporaryClient) throw new Error('Invite not found');

      const secret = process.env.HMAC_SECRET;
      const str = 'client-invite' + email + teamId;
      const isValid = hmac.isValid(secret, signature, str);
      if (!isValid) throw new Error('Signature is not valid');

      await models.clientToTeam.create({
        clientId,
        teamId
      }, {
        transaction: t
      });

      if (temporaryClient.bookIds) {
        const bookIds = temporaryClient.bookIds.split(',');

        for (const bookId of bookIds) {
          await models.teamAccess.create({
            mode: 'read',
            userId: userId,
            teamId: team.id,
            bookId: parseInt(bookId)
          }, {
            transaction: t
          });
        }
      }

      await temporaryClient.destroy({ transaction: t });
    }
  }

  static async getClients ({
    teamId = required()
  } = {}) {
    const clientToTeam = await models.clientToTeam.findAll({
      where: {
        teamId
      },
      include: [
        {
          model: models.client,
          include: [
            {
              model: models.user,
              attributes: ['id', 'email'],
              include: [
                {
                  model: models.profile,
                  attributes: ['id', 'lastName', 'firstName', 'userName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }
              ]
            }
          ]
        }
      ]
    });

    const clients = clientToTeam.map(c => c.client?.get());

    for (const [index, client] of clients.entries()) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          userId: client.userId,
          teamId,
          mode: 'read'
        },
        include: [
          {
            model: models.book,
            attributes: ['title', 'icon']
          }
        ]
      });

      clients[index].books = teamAccess.map(a => a.book?.get());
    }

    const temporaryClients = await models.temporaryClient.findAll({
      where: {
        teamId
      }
    });

    return {
      clients,
      temporaryClients: temporaryClients
    };
  }

  static async deleteClient ({
    clientId = required(),
    teamId = required()
  } = {}) {
    // TODO maybe delete client?
    await seq.transaction(async t => {
      const teamClient = await models.clientToTeam.findOne({
        where: {
          clientId
        },
        transaction: t
      });

      if (!teamClient) throw new Error('Client not found');

      const client = await models.client.findOne({
        where: {
          id: clientId
        }
      });

      if (!client) throw new Error('Client not found');

      await models.teamAccess.destroy({
        where: {
          userId: client.userId,
          teamId: teamId
        },
        force: true,
        paranoid: false,
        transaction: t
      });

      await models.clientToTeam.destroy({
        where: {
          clientId: clientId,
          teamId: teamId
        },
        transaction: t
      });
    });
  }

  static async deleteTemporaryClient ({
    id = required(),
    teamId = required()
  } = {}) {
    const count = await models.temporaryClient.destroy({
      where: {
        id: id,
        teamId: teamId
      }
    });

    if (!count) {
      throw new Error('Temporary client not found');
    }
  }

  static async AddClientAccessToBook ({
    userId = required(),
    clientUserId = required(),
    teamId = required(),
    bookId = required()
  } = {}) {
    const teamAccess = await models.teamAccess.findOne({
      where: {
        userId,
        teamId,
        mode: 'write',
        bookId: bookId
      },
      include: {
        model: models.book
      }
    });

    if (!teamAccess) {
      throw new Error('Permission denied');
    }

    const clientTeamAccess = await models.teamAccess.findOne({
      where: {
        mode: 'read',
        userId: clientUserId,
        teamId,
        bookId
      }
    });

    if (clientTeamAccess) {
      return clientTeamAccess;
    }

    const createdTeamAccess = models.teamAccess.create({
      mode: 'read',
      userId: clientUserId,
      teamId,
      bookId
    });

    await ActivityProducerService.sendMessage({
      from: {
        id: bookId,
        clientId: null
      },
      to: {
        id: bookId,
        clientId: clientUserId
      },
      creatorId: userId,
      type: 'book',
      entity: 'book'
    });

    return createdTeamAccess;
  }

  static async removeClientAccessFromBook ({
    userId = required(),
    clientUserId = required(),
    teamId = required(),
    bookId = required()
  } = {}) {
    // TODO single request
    const teamAccess = await models.teamAccess.findOne({
      where: {
        userId,
        teamId,
        mode: 'write',
        bookId: bookId
      }
    });

    if (!teamAccess) {
      throw new Error('Permission denied');
    }

    const deletedCount = await models.teamAccess.destroy({
      where: {
        mode: 'read',
        userId: clientUserId,
        teamId,
        bookId
      }
    });

    if (deletedCount) {
      await ActivityProducerService.sendMessage({
        from: {
          id: bookId,
          clientId: clientUserId
        },
        to: {
          id: bookId,
          clientId: null
        },
        creatorId: userId,
        type: 'book',
        entity: 'book'
      });
    }
  }
}

module.exports = ClientService;
