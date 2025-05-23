'use strict';

const Router = require('koa-router');
const joi = require('@hapi/joi');
const { BetaTestService } = require('../services');

const router = new Router();

const createSchema = joi.object({
  email: joi.string().email().required()
});

router.get('/tests', async ctx => {
  try {
    const betaTests = await BetaTestService.getAllTests();

    ctx.ok({
      tests: betaTests
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/testers/:uuid', async ctx => {
  const body = ctx.request.body;
  const uuid = ctx.params.uuid;

  ctx.test(uuid, 400, 'No uuid');

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.uuid = uuid;

    await BetaTestService.addTester(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
