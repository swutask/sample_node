'use strict';

const { required } = require('../utils');
const FilterRepo = require('../repos/FilterRepo');
const ActivityProducerService = require('./ActivityProducerService');

class FilterService {
  static async get ({
    userId = required()
  } = {}) {
    const filters = await FilterRepo.getAllByUserId(userId);

    return filters.map(f => f.get());
  }

  static async create ({
    userId = null,
    bookId = null,
    taskFilter,
    name = required(),
    transaction
  } = {}) {
    const filter = await FilterRepo.create({ userId, bookId, name, taskFilter, transaction });

    return filter.get();
  }

  static async update ({
    userId = required(),
    id = required(),
    name,
    bookId,
    taskFilter
  } = {}) {
    const success = await FilterRepo.update({ id, name, userId, bookId, taskFilter });

    if (!success) {
      throw new Error('Filter was not updated');
    }

    if (bookId) {
      await ActivityProducerService.sendMessage({
        from: {
          defaultFilter: null
        },
        to: {
          id: bookId,
          defaultFilter: 'taskFilter'
        },
        creatorId: userId,
        entity: 'book',
        type: 'book'
      });
    }
  }

  static async delete ({
    userId = required(),
    id = required(),
    bookId = null
  } = {}) {
    const success = await FilterRepo.delete({ id, userId, bookId });

    if (!success) {
      throw new Error('Filter was not updated');
    }

    if (bookId) {
      // implement socket to delete filter for everyone
    }
  }
}

module.exports = FilterService;
