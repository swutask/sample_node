'use strict';
const models = require('../models');
const { required } = require('../utils');
const { elasticsearch } = require('../libs/index');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const { Op } = require('sequelize');

const indexPayloadMapForMentions = {
  project: {
    search: ['title'],
    response: ['title', 'icon', 'bookId']
  },
  task: {
    search: ['title'],
    response: ['title', 'bookId', 'parentId']
  },
  attachment: {
    search: ['name'],
    response: ['name', 'url', 'bookId', 'mimetype']
  }
};

class SearchService {
  static async _getAllowedIds ({
    userId,
    teamId,
    bookId = null,
    model
  } = {}) {
    let where = {};
    let allowedBookIds = [];

    // TODO refactor
    if (teamId) {
      if (model === 'member') {
        return TeamMemberRepo.getAllIdsByTeamId(teamId, userId);
      }

      const teamAccess = await models.teamAccess.findAll({
        where: {
          teamId,
          userId,
          projectId: null
        },
        include: [{
          model: models.book,
          where: {
            deletedAt: null
          }
        }]
      });

      const bookIds = teamAccess.map(item => item.bookId);

      allowedBookIds = bookId || [...new Set(bookIds)];
      where.bookId = allowedBookIds;
    } else {
      where = { userId: userId };
    }

    if (model === 'book') {
      const obj = teamId ? { id: allowedBookIds } : { userId };

      const data = await models.book.findAll({
        where: {
          ...obj,
          isSection: false
        }
      });

      return data.map(i => i.id.toString());
    } else if (model === 'message') {
      const chats = await models.chat.findAll({
        where: {
          bookId: allowedBookIds
        }
      });

      const data = await models.message.findAll({
        where: {
          chatId: chats.map(d => d.id)
        }
      });

      return data.map(i => i.id.toString());
    } else if (model === 'attachment') {
      const attachments = await models.attachment.findAll({
        where: {
          [Op.or]: [
            {
              bookId: allowedBookIds
            }
          ]
        }
      });

      return attachments.map((attachment) => attachment.id);
    }

    const data = await models[model].findAll({
      where: where,
      include: [{
        model: models.book,
        where: {
          deletedAt: null
        }
      }]
    });

    return data.map(i => i.id.toString());
  }

  static async search ({
    teamId = null,
    userId = required(),
    searchValue = required()
  } = {}) {
    const list = ['book', 'task', 'message', 'member'];

    const body = [];
    const query = `${searchValue.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&').trim()}`;

    if (query.trim() === '') {
      return [];
    }
    const maxSize = 80;
    const size = Math.round(maxSize / list.length);

    await Promise.all(list.map(async (model) => {
      const indexName = model;
      const ids = await this._getAllowedIds({
        userId,
        teamId,
        model
      });

      if (!ids) {
        return;
      }

      const elasticIndexData = elasticsearch.elasticIndexes.find(item => item.model === indexName);

      body.push(
        { index: elasticIndexData.name },
        {
          size,
          query: {
            bool: {
              must: [
                {
                  terms: {
                    _id: ids
                  }
                },
                {
                  multi_match: {
                    query,
                    fields: elasticIndexData.search,
                    operator: 'and',
                    fuzziness: 2,
                    prefix_length: 1,
                    minimum_should_match: '90%'
                  }
                }
              ]
            }
          },
          _source: elasticIndexData.response,
          highlight: {
            type: 'unified',
            fields: {
              '*': {}
            }
          }
        });
    }));

    const response = await elasticsearch.multiSearch({
      body
    });
    const result = [];
    const messageData = response.reduce((accumulator, responseItem) => {
      if (responseItem._index !== 'complex-message') {
        result.push(responseItem);

        return accumulator;
      }

      const id = responseItem._id;
      accumulator.ids.push(id);
      accumulator.itemMessageIdMap[id] = responseItem;

      return accumulator;
    }, {
      ids: [],
      itemMessageIdMap: {}
    });

    if (messageData.ids.length) {
      const messages = await models.message.findAll({
        where: {
          id: messageData.ids
        },
        include: [
          {
            model: models.chat
          },
          {
            model: models.user,
            attributes: ['id'],
            include: {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            }
          }]
      });

      messages.forEach((message) => {
        const elasticResponseItem = messageData.itemMessageIdMap[message.id];

        result.push({
          ...elasticResponseItem,
          chat: message.chat,
          profile: message.user?.profile
        });
      });
    }

    return result.sort((prev, next) => next._score - prev._score);
  }

  static async searchMentions ({
    teamId = null,
    userId = required(),
    searchValue = required(),
    bookId = required()
  } = {}) {
    const list = ['task'];

    // list.push('project');

    // if (teamId) {
    //   list.push('attachment');
    // }

    const body = [];

    const query = `*${searchValue.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&').trim()}*`;

    await Promise.all(list.map(async (model) => {
      const ids = await this._getAllowedIds({
        userId,
        teamId,
        bookId,
        model
      });

      if (!ids) {
        return;
      }

      const { search, response } = indexPayloadMapForMentions[model];

      body.push(
        { index: `complex-${model}` },
        {
          size: 10,
          query: {
            bool: {
              must: [{
                terms: {
                  _id: ids
                }
              }, {
                query_string: {
                  query,
                  fields: search,
                  default_operator: 'AND'
                }
              }]
            }
          },
          _source: response
        });
    }));

    return elasticsearch.multiSearch({
      body
    });
  }

  static async searchMessages ({
    searchValue = required(),
    chatId = required()
  } = {}) {
    const query = `${searchValue.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&').trim()}`;

    const data = await models.message.findAll({
      where: {
        chatId
      }
    });

    const ids = data.map(i => i.id.toString());

    if (!ids) {
      return;
    }

    const result = await elasticsearch.search('message', {
      size: 50,
      query: {
        bool: {
          must: [
            {
              terms: { _id: ids }
            }, {
              multi_match: {
                query,
                fields: ['text'],
                operator: 'and',
                fuzziness: 2,
                prefix_length: 1,
                minimum_should_match: '90%'
              }
            }
          ]
        }
      },
      _source: {
        exclude: '*'
      },
      highlight: {
        type: 'unified',
        fields: {
          '*': {}
        }
      }
    });

    const messageIds = result.hints.map(r => parseInt(r._id));

    const messages = await models.message.findAll({
      where: {
        id: messageIds
      },
      include: [
        {
          model: models.user,
          attributes: ['id'],
          include: [
            {
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            },
            {
              model: models.avatar,
              attributes: ['url']
            }
          ]
        }]
    });

    return messages.map((message) => {
      const elasticResponseItem = result.hints.find(m => +m._id === +message.id);

      return {
        ...message.get(),
        highlight: elasticResponseItem.highlight
      };
    });
  }
}

module.exports = SearchService;
