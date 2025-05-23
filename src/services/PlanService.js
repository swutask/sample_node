'use strict';

const models = require('../models');
const { throwErrorWithCode } = require('../utils');
const errors = require('../errors');
const { Op } = require('sequelize');
const TaskRepo = require('../repos/TaskRepo');
const SubscriptionRepo = require('../repos/SubscriptionRepo');
const BookRepo = require('../repos/BookRepo');

class PlanService {
  static async checkTasks (userId, teamId) {
    const plan = await this._getUserPlanForCheck(teamId);

    if (!teamId) {
      return;
    }

    const bookIds = await BookRepo.getUniqIdsByTeamAccessTeamId(teamId);

    if (!bookIds) {
      return;
    }

    const tasksCont = await TaskRepo.countByBookIdsAndIsSample(bookIds, false);

    if (plan.maxTasks >= 0 && tasksCont >= plan.maxTasks) {
      throwErrorWithCode('Tasks quota', errors.QUOTA_TASKS);
    }
  }

  static async checkBooks (userId, teamId) {
    const plan = await this._getUserPlanForCheck(teamId);
    let books = null;

    if (teamId) {
      // TODO simplify request
      const teamAccess = await models.teamAccess.findAll({
        where: {
          teamId: teamId,
          bookId: { [Op.ne]: null },
          projectId: null
        },
        include: [
          {
            model: models.book,
            where: {
              isSection: false,
              isSample: false
            }
          }
        ]
      });

      const arr = teamAccess.map(t => t.book);
      const uniqueBooks = [...new Map(arr.map(item => [item.id, item])).values()];

      books = uniqueBooks.length;
    } else {
      books = await models.book.count({
        where: {
          userId: userId,
          isSection: false,
          isSample: false
        }
      });
    }

    if (!books) books = 0;

    if (plan.maxBooks !== -1) {
      if (books >= plan.maxBooks) {
        throwErrorWithCode('Spaces quota', errors.QUOTA_BOOKS);
      }
    }
  }

  static async checkMembers (userId, teamId) {
    const plan = await this._getUserPlanForCheck(teamId);
    let members = await models.teamMember.count({
      where: {
        teamId: teamId
      }
    });
    if (!members) members = 0;

    if (plan.maxBooks !== -1) {
      if (members >= plan.maxMembers) {
        throwErrorWithCode('Members quota', errors.QUOTA_MEMBERS);
      }
    }
  }

  static async checkClients (userId, teamId) {
    const plan = await this._getUserPlanForCheck(teamId);
    let clients = await models.clientToTeam.count({
      where: {
        teamId: teamId
      }
    });
    if (!clients) clients = 0;

    if (plan.maxClients !== -1) {
      if (clients >= plan.maxClients) {
        throwErrorWithCode('Clients quota', errors.QUOTA_BOOKS);
      }
    }
  }

  static async checkSize ({
    teamId,
    newSize
  }) {
    const plan = await this._getUserPlanForCheck(teamId);
    const maxSize = parseInt(plan.maxSize);
    const singleFileSize = parseInt(plan.singleFileSize);

    if (newSize > singleFileSize) {
      throwErrorWithCode('Single size quota', errors.QUOTA_SINGLE_SIZE);
    }

    let size = await models.attachment.sum('size', {
      where: { teamId }
    });

    if (!size) {
      size = 0;
    }

    size += newSize;

    if (maxSize !== -1) {
      if (size >= maxSize) {
        throwErrorWithCode('Size quota', errors.QUOTA_SIZE);
      }
    }
  }

  static async getPlans () {
    const plans = await models.plan.findAll({
      attributes: {
        exclude: [
          'createdAt',
          'data'
        ]
      }
    });
    return plans.map(p => p.get());
  }

  static async getSubscription ({
    teamId = require()
  } = {}) {
    const sub = await SubscriptionRepo.getActiveSubscription({ teamId }, {
      attributes: {
        exclude: [
          'id',
          'userId',
          'deletedAt',
          'data',
          'updatedAt'
        ]
      }
    });

    return sub.get();
  }

  static async _getUserPlanForCheck (teamId) {
    const sub = await SubscriptionRepo.getActiveSubscription({
      teamId,
      [Op.or]: [{
        expireAt: null
      }, {
        expireAt: {
          [Op.gte]: new Date()
        }
      }]
    }, {
      include: [{
        model: models.plan,
        required: true
      }]
    });

    return sub.plan.get();
  }
}

module.exports = PlanService;
