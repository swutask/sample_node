'use strict';

const Router = require('koa-router');
const { jwtAuth } = require('../middlewares');
const { SettingsService } = require('../services');
const joi = require('@hapi/joi');

const router = new Router({
  prefix: '/settings'
});

const updateSchema = joi.object({
  mode: joi.string(),
  columnWidth: joi.string(),
  fontSize: joi.string(),
  fontFamily: joi.string(),
  theme: joi.string(),
  bookView: joi.string(),
  lineHeight: joi.string(),
  grammarCheck: joi.boolean(),
  taskOrdering: joi.boolean(),
  taskFullScreen: joi.boolean()
});

const updateSidebarToolSchema = joi.object({
  calendar: joi.boolean(),
  timeline: joi.boolean(),
  chat: joi.boolean(),
  feed: joi.boolean()
});

router.get('/', jwtAuth(), async ctx => {
  try {
    const settings = await SettingsService.getByUserId(ctx.state.user.id);
    ctx.ok(settings);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    await SettingsService.update(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/sidebar-tools', jwtAuth(), async ctx => {
  try {
    const tools = await SettingsService.getSidebarToolsByUserId(ctx.state.user.id);

    ctx.ok({ tools });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/sidebar-tools', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const tools = await updateSidebarToolSchema.validateAsync(body, {
      stripUnknown: true
    });

    console.log(tools);

    await SettingsService.updateSidebarTools({
      userId: ctx.state.user.id,
      tools: tools
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
