'use strict';

const Router = require('koa-router');
const { GoogleCalendarService } = require('../services');
const joi = require('@hapi/joi');
const { jwtAuth, team } = require('../middlewares');
const compose = require('koa-compose');

const router = new Router({
  prefix: '/google-calendar'
});

const updateGoogleSchema = joi.object({
  allowSendToGoogle: joi.boolean().required()
});

router.get('/synced', jwtAuth(), async ctx => {
  try {
    const result = await GoogleCalendarService.isSyncedGoogleCalendar({
      userId: ctx.state.user.id
    });

    ctx.ok(result);
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/getCalendars', jwtAuth(), async ctx => {
  try {
    const list = await GoogleCalendarService.googleCalendars({
      userId: ctx.state.user.id
    });
    ctx.ok(list);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  try {
    const { allowSendToGoogle } = await updateGoogleSchema.validateAsync(body, {
      stripUnknown: true
    });

    await GoogleCalendarService.updateGoogleCalendarUser({
      userId: ctx.state.user.id,
      allowSendToGoogle
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  try {
    await GoogleCalendarService.disableGoogleCalendar({
      userId: ctx.state.user.id
    });

    ctx.ok();
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/calendar/webhook/v3/:userId/:teamId/:calendarId', async ctx => {
  const userId = parseInt(ctx.params.userId);
  const teamId = parseInt(ctx.params.teamId);

  try {
    if (ctx.request.header['x-goog-resource-state'] === 'sync') {
      ctx.ok();

      return;
    }

    const channelId = ctx.request.header['x-goog-channel-id'];
    const resourceId = ctx.request.header['x-goog-resource-id'];

    await GoogleCalendarService.parseWebhook({
      userId,
      teamId,
      channelId,
      resourceId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
