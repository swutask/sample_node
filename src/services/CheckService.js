
'use strict';
const models = require('../models');
const { required } = require('../utils');

class CheckService {
  static async checkUserBook ({
    userId = required(),
    bookIds,
    teamId,
    hasClientAccess = true
  } = {}) {
    let books = [];

    if (teamId) {
      // handle team user
      const mode = hasClientAccess
        ? ['read', 'write']
        : 'write';

      const isCalendarBook = await models.book.findOne({
        where: {
          id: bookIds[0],
          isCalendar: true
        }
      });

      const include = isCalendarBook ? {} : {
        include: {
          model: models.teamAccess,
          as: 'memberTeamAccesses',
          attributes: [],
          where: {
            mode,
            userId: userId,
            teamId: teamId,
            projectId: null
          },
          paranoid: false
        }
      };

      books = await models.book.findAll({
        where: {
          id: bookIds
        },
        paranoid: false,
        attributes: ['id', 'title'],
        ...include
      });
    } else {
      // handle personal user
      books = await models.book.findAll({
        where: {
          id: bookIds,
          userId
        }
      });
    }

    if (books.length !== bookIds.length) {
      throw new Error('Permission denied');
    }
  }
}

module.exports = CheckService;
