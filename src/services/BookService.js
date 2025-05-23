'use strict';
const models = require('../models');
const { throwErrorWithCode } = require('../utils');
const { sequelize: { sequelize: seq } } = require('../loaders');
const { Op } = require('sequelize');
const { required } = require('../utils');
const NotificationService = require('./NotificationService');
const colors = require('../core/eventTags.json');
const { sampleTaskRows, taskRows } = require('../core/taskRows');
const NotificationCodes = require('../core/NotificationCodes.js');
const { elasticsearch } = require('../libs');
const BookOrderRepo = require('../repos/BookOrderRepo');
const FilterRepo = require('../repos/FilterRepo');
const ActivityProducerService = require('./ActivityProducerService');
const BookRepo = require('../repos/BookRepo');
const TeamMemberRepo = require('../repos/TeamMemberRepo');

class BookService {
  static async createWithTransaction ({
    title = required(),
    userId = required(),
    icon,
    color,
    teamId = null,
    favorite,
    isSample,
    subTitle,
    isSection,
    members = [],
    duplicate = false,
    order = 9999,
    bookFolderId = null,
    isCalendar
  } = {}) {
    const createdBook = await seq.transaction(async t => {
      return this.create({
        title,
        userId,
        icon,
        color,
        teamId,
        favorite,
        isSample,
        subTitle,
        isSection,
        members,
        duplicate,
        order,
        bookFolderId,
        t,
        isCalendar
      });
    });

    await Promise.all(
      createdBook.shareWith.map(
        (member) => NotificationService.createNotification({
          userId,
          targetUserId: member.userId,
          teamId,
          bookId: createdBook.id,
          title: NotificationCodes.BOOK_MEMBER_ADD
        })
      )
    );

    return createdBook;
  }

  static async create ({
    title = required(),
    userId = required(),
    icon,
    color,
    teamId = null,
    favorite,
    isSample,
    subTitle,
    isSection,
    members = [],
    duplicate = false,
    order = 9999,
    bookFolderId = null,
    t = required(),
    isCalendar
  } = {}) {
    const book = await models.book.create({
      title,
      subTitle,
      isSection,
      color,
      favorite,
      icon,
      isSample,
      userId: teamId ? null : userId,
      teamId,
      bookFolderId,
      isCalendar
    }, {
      transaction: t
    });

    await models.bookOrder.create({
      bookId: book.id,
      userId: userId,
      order
    }, {
      transaction: t
    });

    const taskFilter = '{"showCompletedFilter":{"label":"All","val":0},"search":"","membersFilter":null,"tagsFilter":[],"urgencyFilter":[],"dateFilter":[],"showOnTask":[{"name":"Labels","key":"labels","width":56.45,"selected":true},{"name":"Assignee","key":"assignee","width":70.47,"selected":true},{"name":"Priority","key":"priority","width":59.92,"selected":true},{"name":"Due date","key":"dueDate","width":73,"selected":true},{"name":"Comments","key":"comments","width":79.08,"selected":true},{"name":"Attachments","key":"attachments","width":89.28,"selected":false,"isHidden":true},{"name":"Description","key":"description","width":82,"selected":false,"isHidden":true},{"name":"Subtitle","key":"subtitle","width":62.75,"selected":true},{"name":"Image","key":"image","width":52.52,"selected":true},{"name":"Estimate","key":"storyPoints","width":66,"selected":true}],"sortedBy":"Manual","groupBy":"Status"}';

    await FilterRepo.create({ bookId: book.id, transaction: t, name: 'Today', taskFilter });

    if (!isSection && !duplicate) {
      // create tags
      for (const c of colors) {
        await models.taskTag.create({
          color: c,
          bookId: book.id
        }, {
          transaction: t
        });
      }
      // create task rows

      const taskRowColors = isSample ? sampleTaskRows : taskRows;

      const rowsBulk = taskRowColors.map((row, i) => {
        return {
          title: row.title,
          color: row.color,
          bookId: book.id,
          teamId,
          userId: teamId ? null : userId,
          order: i
        };
      });

      await models.taskRow.bulkCreate(rowsBulk, {
        transaction: t
      });
    }

    const shareWith = [];

    if (teamId) {
      await models.teamAccess.create({
        mode: 'write',
        userId: userId,
        teamId: teamId,
        bookId: book.id
      }, {
        transaction: t
      });

      const chat = await models.chat.create({
        teamId: teamId,
        bookId: book.id
      }, {
        transaction: t
      });

      await models.chatSetting.create({
        chatId: chat.id,
        userId: userId,
        mutedAt: null
      }, {
        transaction: t
      });

      const me = await models.teamMember.findOne({
        where: {
          userId: userId,
          teamId: teamId
        },
        include: [
          {
            model: models.user,
            attributes: ['id'],
            include: [
              {
                model: models.profile
              },
              {
                model: models.avatar,
                attributes: ['url']
              }
            ]
          }
        ],
        transaction: t
      });

      shareWith.push({
        ...me.user.profile.dataValues,
        id: me.id,
        userId: me.user.id,
        avatar: me.user.avatar
      });

      if (members.length > 0) {
        for (const member of members) {
          await this._addMemberToBook({
            userId: userId,
            teamId: teamId,
            bookId: book.id,
            memberId: member,
            t: t
          });

          const mentionedMember = await models.teamMember.findByPk(member,
            {
              include: [
                {
                  model: models.user,
                  attributes: ['id'],
                  include: [
                    {
                      model: models.profile
                    },
                    {
                      model: models.avatar,
                      attributes: ['url']
                    }
                  ]
                }
              ],
              transaction: t
            }
          );

          shareWith.push({
            ...mentionedMember.user.profile.dataValues,
            id: mentionedMember.id,
            userId: mentionedMember.user.id,
            avatar: mentionedMember.user.avatar
          });
        }
      }
    }

    const result = {
      ...book.get(),
      shareWith
    };

    if (!isSection && !isCalendar) {
      try {
        await elasticsearch.updateById({
          id: result.id,
          obj: result,
          modelName: 'book',
          upsert: true
        });
      } catch (e) {
        console.log('elastic update', e);
      }
    }

    return result;
  }

  static async createCalendarBook (userId, transaction) {
    const calendarData = {
      title: 'Google-calendar',
      teamId: null,
      userId,
      icon: 'calendar',
      isCalendar: true,
      t: transaction
    };
    await this.create(calendarData);
  }

  static async duplicate ({
    teamId,
    id = required(),
    userId = required()
  } = {}) {
    const result = await seq.transaction(async t => {
      const book = await models.book.findOne({
        where: {
          id: id,
          userId: teamId ? null : userId
        },
        include: [
          { model: models.project },
          { model: models.bookLink },
          { model: models.filter },
          {
            model: models.bookOrder,
            attributes: ['order', 'createdAt'],
            where: {
              userId: userId
            },
            required: false
          }
        ],
        transaction: t
      });

      if (!book) {
        throw new Error('Project not found');
      }

      if (book.isSample) {
        throw new Error('Can not duplicate');
      }

      const newBook = await models.book.create({
        title: book.title,
        subTitle: book.subTitle,
        color: book.color,
        archivedAt: book.archivedAt,
        favorite: book.favorite,
        icon: book.icon,
        userId: teamId ? null : userId
      }, {
        transaction: t
      });

      await models.bookOrder.create({
        bookId: newBook.id,
        userId: userId,
        order: book.bookOrder.order || 9999
      }, {
        transaction: t
      });

      await FilterRepo.create({
        bookId: newBook.id,
        taskFilter: book.filter.task,
        transaction: t
      });

      // create tags
      for (const c of colors) {
        await models.taskTag.create({
          color: c,
          bookId: newBook.id
        }, {
          transaction: t
        });
      }

      // create task rows
      for (const [index, row] of taskRows.entries()) {
        await models.taskRow.create({
          title: row.title,
          color: row.color,
          bookId: newBook.id,
          teamId,
          userId: teamId ? null : userId,
          order: index
        }, {
          transaction: t
        });
      }

      if (book.bookLinks?.length > 0) {
        for (const link of book.bookLinks) {
          await models.bookLink.create({
            url: link.url,
            name: link.name,
            bookId: newBook.id,
            userId: link.userId,
            description: link.description
          }, {
            transaction: t
          });
        }
      }

      const shareWith = [];

      if (teamId) {
        const teamAccess = await models.teamAccess.findAll({
          where: {
            mode: 'write',
            teamId: teamId,
            bookId: book.id
          },
          transaction: t
        });

        const uniqueUsers = [...new Map(teamAccess.map(item => [item.userId, item.dataValues])).values()];

        let members = await models.teamMember.findAll({
          where: {
            userId: uniqueUsers.map(u => u.userId),
            teamId: teamId
          },
          transaction: t,
          include: [
            {
              model: models.user,
              attributes: ['id'],
              include: [
                {
                  model: models.profile
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }
              ]
            }
          ]
        });

        const chat = await models.chat.create({
          teamId: teamId,
          bookId: newBook.id
        }, {
          transaction: t
        });

        await models.chatSetting.create({
          chatId: chat.id,
          userId: userId,
          mutedAt: null
        }, {
          transaction: t
        });

        const me = members.find(u => u.userId === userId);
        members = members.filter(u => u.userId !== userId);
        members.unshift(me);

        for (const member of members) {
          await this._addMemberToBook({
            userId: userId,
            teamId: teamId,
            bookId: newBook.id,
            memberId: member.id,
            t: t
          });

          shareWith.push({
            ...member.user.profile.dataValues,
            id: member.id,
            userId: member.user.id,
            avatar: member.user.avatar
          });
        }
      }

      return {
        ...newBook.get(),
        shareWith
      };
    });

    await Promise.all(
      result.shareWith.map(
        (member) => NotificationService.createNotification({
          userId,
          targetUserId: member.userId,
          teamId,
          bookId: result.id,
          title: NotificationCodes.BOOK_MEMBER_ADD
        })
      )
    );

    await elasticsearch.updateById({
      id: result.id,
      obj: result,
      modelName: 'book',
      upsert: true
    });

    return result;
  }

  static async getList ({ userId = required() } = {}) {
    const books = await models.book.findAll({
      where: {
        userId: userId
      },
      include: [
        {
          model: models.project
        },
        {
          model: models.bookOrder,
          attributes: ['order', 'createdAt'],
          where: {
            userId: userId
          },
          required: false
        }
      ],
      order: [
        [models.bookOrder, 'order'],
        [models.bookOrder, 'createdAt'],
        'createdAt']
    });

    return books.map(p => p.get());
  }

  static async getById ({
    id = required(),
    userId = required(),
    teamId
  } = {}) {
    return seq.transaction(async t => {
      const book = await models.book.findOne({
        where: {
          id,
          userId: teamId ? null : userId
        },
        transaction: t,
        include: [
          {
            model: models.bookLink
          },
          {
            model: models.filter
          },
          {
            model: models.chat,
            include: [{
              model: models.chatSetting,
              where: {
                userId: userId
              }
            }]
          }
        ]
      });

      if (!book) {
        throwErrorWithCode('Project not found');
      }

      let owner = null;
      let members = [];
      let clients = [];

      if (teamId) {
        if (!book.chat) {
          const chat = await models.chat.findOne({
            where: {
              bookId: book.id
            }
          });

          if (chat) {
            await models.chatSetting.create({
              chatId: chat.id,
              userId: userId,
              mutedAt: null
            }, {
              transaction: t
            });
          }
        }

        const teamAccesses = await models.teamAccess.findAll({
          where: {
            mode: 'write',
            teamId: teamId,
            bookId: id,
            projectId: null
          },
          transaction: t,
          include: [{
            model: models.user,
            attributes: ['id', 'email'],
            required: true,
            include: [
              {
                model: models.profile
              },
              { model: models.avatar },
              {
                model: models.teamMember,
                attributes: ['id']
              }
            ]
          }],
          order: [['createdAt', 'ASC']]
        });
        owner = teamAccesses[0];

        members = teamAccesses.map(teamAccess => ({
          ...teamAccess.user.profile.dataValues,
          id: teamAccess.user.teamMember?.id,
          email: teamAccess.user.email,
          avatar: teamAccess.user.avatar
        }));

        const user = await models.user.findByPk(userId);

        if (!user.isClient) {
          const clientAccess = await models.teamAccess.findAll({
            where: {
              mode: 'read',
              teamId: teamId,
              bookId: id
            },
            transaction: t,
            order: [['createdAt', 'ASC']]
          });

          clients = await models.client.findAll({
            where: {
              userId: clientAccess.map(c => c.userId)
            },
            transaction: t,
            include: [{
              model: models.user,
              attributes: ['id', 'email'],
              required: true,
              include: [
                {
                  model: models.profile
                },
                { model: models.avatar }
              ]
            }]
          });
        }
      }

      return {
        book,
        members,
        owner,
        clients
      };
    });
  }

  static async getDeletedBooks ({
    userId = required(),
    teamId
  } = {}) {
    const where = {
      isSection: false,
      bookFolderId: null,
      deletedAt: {
        [Op.ne]: null
      }
    };

    if (teamId) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          mode: 'write',
          userId: userId,
          teamId: teamId,
          bookId: { [Op.ne]: null },
          projectId: null
        },
        paranoid: false
      });

      const ids = teamAccess.map(t => t.bookId);

      where.id = ids;
    } else {
      where.userId = userId;
    }

    const books = await models.book.findAll({
      where: where,
      order: [['deletedAt', 'desc']],
      attributes: ['id', 'title', 'icon', 'deletedAt'],
      paranoid: false
    });

    return books.map(b => b.get());
  }

  static async delete ({
    id = required(),
    permanent = false,
    t
  }) {
    const count = await models.book.destroy({
      where: {
        id: id
      },
      force: permanent,
      paranoid: false,
      transaction: t
    });

    if (!count) {
      throw new Error('Project not found');
    }
  }

  static async deleteInTransaction ({
    id = required(),
    userId = required(),
    teamId = null,
    permanent = false
  } = {}) {
    await seq.transaction(t => {
      return this.delete({
        id: [id],
        userId,
        teamId,
        permanent,
        t
      });
    });
  }

  static async update ({
    id = required(),
    userId = required(),
    title,
    subTitle,
    color,
    icon,
    favorite,
    teamId,
    archivedAt,
    bookFolderId
  } = {}) {
    if (!teamId && bookFolderId !== undefined) {
      throw new Error('Team not found');
    }

    const book = await models.book.findOne({
      where: {
        id,
        userId: teamId ? null : userId
      }
    });

    if (!book) {
      throw new Error('Project not found');
    }

    const updatedBook = await BookRepo.updateById({
      title,
      subTitle,
      color,
      icon,
      favorite,
      archivedAt,
      bookFolderId
    }, id);

    if (!updatedBook) {
      throw new Error('Project not found');
    }

    if (!book.isSection && (title || subTitle)) {
      await elasticsearch.updateById({
        id,
        obj: {
          title: title,
          subTitle: subTitle
        },
        modelName: 'book'
      });
    }

    if (book.teamId) {
      await ActivityProducerService.sendMessage({
        from: book,
        to: updatedBook,
        creatorId: userId,
        type: 'book',
        entity: 'book'
      });
    }
  }

  static async restore ({
    id = required(),
    userId = required(),
    teamId
  } = {}) {
    return seq.transaction(async t => {
      const count = await models.book.update(
        {
          deletedAt: null
        },
        {
          where: {
            id: id,
            userId: teamId ? null : userId
          },
          paranoid: false,
          transaction: t
        }
      );

      if (count[0] === 0) throw new Error('Project not found');

      if (teamId) {
        await models.teamAccess.update({
          deletedAt: null
        },
        {
          where: {
            teamId: teamId,
            bookId: id
          },
          transaction: t,
          paranoid: false
        });

        await models.notification.update({
          deletedAt: null
        }, {
          where: {
            bookId: id
          },
          transaction: t,
          paranoid: false
        });
      }

      await models.project.update(
        {
          deletedAt: null
        },
        {
          returning: true,
          where: {
            bookId: id,
            userId: teamId ? null : userId
          },
          paranoid: false,
          transaction: t
        }
      );
    });
  }

  /**
   * @param ids {{
   *   bookId: number | undefined,
   *   bookFolderId: number | undefined,
   * }[]}
   * @param userId
   * @return {Promise<void>}
   */
  static async order ({
    ids = required(),
    userId = required()
  } = {}) {
    const updateData = ids.reduce((accumulator, {
      bookId,
      bookFolderId
    }, index) => {
      // (user_id, book_id, book_folder_id, "order", created_at, updated_at)
      const data = [
        userId,
        bookId || null,
        bookFolderId || null,
        index,
        new Date(),
        new Date()
      ];

      if (bookId) {
        accumulator.book.push(data);
      } else {
        accumulator.bookFolder.push(data);
      }

      return accumulator;
    }, {
      book: [],
      bookFolder: []
    });

    await BookOrderRepo.bulkCreateOrUpdateBooks(updateData.book);
    await BookOrderRepo.bulkCreateOrUpdateBookFolders(updateData.bookFolder);
  }

  static async mentionMember ({
    userId = required(),
    teamId = required(),
    bookId = required(),
    memberId = required(),
    projectId,
    commentId,
    taskId,
    chatId,
    message
  } = {}) {
    const member = await models.teamMember.findByPk(memberId);

    if (!member) return;

    const teamAccess = await models.teamAccess.findOne({
      where: {
        mode: 'write',
        teamId,
        bookId,
        userId: member.userId
      }
    });

    let title = NotificationCodes.MENTIONED_IN_PAGE;

    if (commentId) {
      title = NotificationCodes.MENTIONED_IN_COMMENT;
    } else if (chatId) {
      title = NotificationCodes.MENTIONED_IN_CHAT;
    } else if (taskId) {
      title = NotificationCodes.MENTIONED_IN_TASK;
    }

    if (teamAccess) {
      await NotificationService.createNotification({
        userId,
        teamId,
        bookId,
        chatId,
        taskId,
        commentId,
        projectId,
        targetUserId: member.userId,
        message,
        title: title
      });
    }
  }

  static async createLink ({
    bookId = required(),
    userId = required(),
    name = required(),
    url = required(),
    teamId = null,
    description
  } = {}) {
    const book = await models.book.findOne({
      where: {
        id: bookId,
        userId: teamId ? null : userId
      }
    });

    if (!book) {
      throw new Error('Project not found');
    }

    const createdBookLink = await models.bookLink.create({
      url,
      name,
      bookId,
      userId,
      description
    });

    if (createdBookLink) {
      await ActivityProducerService.sendMessage({
        from: {
          id: bookId,
          bookLinkId: null
        },
        to: {
          id: bookId,
          bookLinkId: createdBookLink.name
        },
        creatorId: userId,
        type: 'book',
        entity: 'book'
      });
    }

    return createdBookLink;
  }

  static async deleteLink ({
    id = required(),
    bookId = required(),
    userId = required(),
    teamId = null
  } = {}) {
    const book = await models.book.findOne({
      where: {
        id: bookId,
        userId: teamId ? null : userId
      }
    });

    if (!book) {
      throw new Error('Project not found');
    }

    const bookLink = await models.bookLink.findOne({
      where: {
        id,
        bookId
      }
    });

    if (!bookLink) {
      throw new Error('Link not found');
    }

    await models.bookLink.destroy({
      where: {
        id: bookLink.id
      },
      force: true
    });
    await ActivityProducerService.sendMessage({
      from: {
        id: bookId,
        bookLinkId: bookLink.name
      },
      to: {
        id: bookId,
        bookLinkId: null
      },
      creatorId: userId,
      type: 'book',
      entity: 'book'
    });
  }

  static async addMemberToBook ({
    userId = required(),
    memberId = required(),
    teamId = required(),
    bookId = required()
  }) {
    const { memberUserId } = await seq.transaction(async t => {
      return this._addMemberToBook({
        userId,
        memberId,
        teamId,
        bookId,
        t
      });
    });

    await NotificationService.createNotification({
      userId,
      targetUserId: memberUserId,
      teamId,
      bookId,
      title: NotificationCodes.BOOK_MEMBER_ADD
    });
  }

  static async _addMemberToBook ({
    userId = required(),
    memberId = required(),
    teamId = required(),
    bookId = required(),
    t = required()
  } = {}) {
    const member = await models.teamMember.findByPk(memberId, { transaction: t });

    if (!member) {
      throw new Error('Member not found');
    }

    const book = await models.book.findOne({
      where: {
        id: bookId
      },
      include: [{
        model: models.chat
      }],
      transaction: t
    });

    if (book.isSample) {
      throw new Error('You cannot add a member to sample project');
    }

    const teamAccess = await models.teamAccess.findOne({
      where: {
        userId: member.userId,
        teamId: teamId,
        bookId: bookId
      },
      transaction: t
    });

    if (teamAccess) {
      throw new Error('Member already has access to this book');
    }

    await models.teamAccess.create({
      mode: 'write',
      userId: member.userId,
      teamId: teamId,
      bookId: bookId
    }, {
      transaction: t
    });

    await models.chatSetting.findOrCreate({
      where: {
        chatId: book.chat.id,
        userId: member.userId
      },
      defaults: {
        chatId: book.chat.id,
        userId: member.userId,
        mutedAt: null
      },
      transaction: t
    });

    const projects = await models.project.findAll({
      where: {
        bookId: bookId
      },
      transaction: t
    });

    for (const project of projects) {
      await models.teamAccess.create({
        mode: 'write',
        userId: member.userId,
        teamId: teamId,
        bookId: bookId,
        projectId: project.id
      }, {
        transaction: t
      });
    }

    await ActivityProducerService.sendMessage({
      from: {
        relatedUserId: null
      },
      to: {
        id: bookId,
        relatedUserId: member.userId
      },
      creatorId: userId,
      type: 'book',
      entity: 'book'
    });

    return {
      memberUserId: member.userId
    };
  }

  /**
   * @param bookId {number}
   * @returns {Promise<*[]>}
   */
  static getMembers ({
    bookId
  }) {
    return TeamMemberRepo.getAllByBookIdWithUserInfo(bookId);
  }
}

module.exports = BookService;
