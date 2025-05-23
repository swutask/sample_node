'use strict';

const models = require('../models');
const Sequelize = require('sequelize');

class StatisticService {
  static async getSignedUpStatistic ({
    limit = 50,
    page = 1,
    orderDirection = 'ASC',
    orderColumn = 'createdAt'
  } = {}) {
    const offset = limit * (+page - 1);

    const map = {
      createdAt: [
        ['createdAt', orderDirection]
      ],
      members: [
        [[Sequelize.literal('count'), orderDirection]]
      ],
      plan: [
        [{ model: models.subscription }, 'planId', orderDirection]
      ]
    };

    if (!['ASC', 'DESC'].includes(orderDirection)) throw new Error('Invalid order direction');
    if (!Object.keys(map).includes(orderColumn)) throw new Error('Invalid order name');

    const order = map[orderColumn];

    const result = await models.team.findAndCountAll({
      attributes: [
        'id',
        'createdAt',
        'name',
        [Sequelize.literal('(SELECT COUNT(*) FROM team_members WHERE team_id = team.id)'), 'count']
      ],
      include: [
        {
          model: models.teamMember,
          include: [
            {
              model: models.user,
              attributes: ['id'],
              include: [{
                model: models.profile,
                attributes: ['id', 'userName', 'firstName', 'lastName', 'color', 'location', 'timezone', 'position']
              },
              { model: models.avatar }
              ]
            }
          ]
        },
        {
          model: models.subscription,
          where: {
            isActive: true,
            isCancelled: false
          },
          attributes: ['expireAt', 'planId'],
          order: [
            ['id', 'DESC']
          ]

        }
      ],
      distinct: true,
      offset: offset,
      limit: limit,
      order: order
    });

    const teams = result.rows.map(t => t.get());

    return {
      count: result.count,
      result: teams
    };
  }
}

module.exports = StatisticService;
