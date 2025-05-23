'use strict';
const models = require('../models');
const { required } = require('../utils');
const { sequelize } = require('../loaders');

class BetaTestService {
  static async getAllTests () {
    const betaTests = await models.betaTest.findAll();
    return betaTests;
  }

  static async addTester ({
    email = required(),
    uuid = required()
  } = {}) {
    await sequelize.sequelize.transaction(async t => {
      const betaTest = await models.betaTest.findOne({
        where: {
          uuid: uuid
        },
        transaction: t
      });

      if (!betaTest) throw new Error('beta_test not found');

      await models.betaTester.findOrCreate({
        where: {
          email: email,
          betaTestId: betaTest.id
        },
        transaction: t
      });
    });
  }
}

module.exports = BetaTestService;
