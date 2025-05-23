const { required } = require('../utils/index');
const models = require('../models/index');
const { Op } = require('sequelize');

function getDefaultInclude () {
  return [
    { model: models.team },
    {
      model: models.user,
      attributes: ['id', 'email'],
      include: [{
        model: models.profile,
        attributes: ['firstName', 'lastName', 'color', 'timezone', 'timezoneName']
      },
      {
        model: models.avatar,
        attributes: ['url']
      }]
    },
    {
      model: models.teamMember,
      include: {
        model: models.user,
        attributes: ['id'],
        include: [{
          model: models.profile,
          attributes: ['firstName', 'lastName', 'color']
        },
        {
          model: models.avatar,
          attributes: ['url']
        }]
      }
    },
    { model: models.project },
    { model: models.book },
    {
      model: models.chat,
      include: {
        model: models.message,
        attributes: ['text'],
        separate: true,
        limit: 1,
        order: [['createdAt', 'DESC']]
      }
    },
    { model: models.attachment },
    { model: models.task },
    { model: models.comment },
    {
      model: models.message,
      as: 'chatMessage'
    }
  ];
}

class NotificationRepo {
  static async getById (id = required()) {
    const notification = await models.notification.findByPk(id, {
      include: getDefaultInclude()
    });

    if (!notification) {
      return null;
    }

    return notification.get();
  }

  /**
   * @param userId {number}
   * @param title {number[]}
   * @param category {string}
   * @param createdAt {Date}
   * @returns {Promise<*[]>}
   */
  static async getAllByUserIdTitleCategoryCreatedAt (userId, title, category, createdAt) {
    const notifications = await models.notification.findAll({
      where: {
        userId,
        category,
        createdAt: {
          [Op.gt]: createdAt
        },
        title
      },
      include: [
        { model: models.team },
        {
          model: models.teamMember,
          include: {
            model: models.user,
            attributes: ['id'],
            include: {
              model: models.profile,
              attributes: ['firstName', 'lastName']
            }
          }
        },
        { model: models.project },
        { model: models.book },
        {
          model: models.chat,
          include: {
            model: models.message,
            attributes: ['text'],
            separate: true,
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        },
        { model: models.attachment },
        { model: models.task },
        { model: models.comment }
      ]
    });

    return notifications.map((notification) => notification.get());
  }
}

module.exports = NotificationRepo;
