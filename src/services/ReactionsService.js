
'use strict';
const ReactionRepo = require('../repos/ReactionRepo');

class ReactionsService {
  static async getReactions () {
    return ReactionRepo.getReactions();
  }
}

module.exports = ReactionsService;
