'use strict';

const Router = require('koa-router');
const { ApplePayService } = require('../../services');
const { jwtAuth } = require('../../middlewares');
const log = require('../../log')('applePay-router');
const joi = require('@hapi/joi');

const router = new Router({
  prefix: '/applePay'
});

const validateSchema = joi.object({
  receipt: joi.string().required()
});

router.post('/', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await validateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    await ApplePayService.validateReceipt(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/webhook', async ctx => {
  const body = ctx.request.body;

  try {
    await ApplePayService.parseWebhook(body);
  } catch (err) {
    log.error(err);
  }
  ctx.ok();
});

module.exports = router;
