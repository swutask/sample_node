'use strict';

const Router = require('koa-router');
const { ReminderService } = require('../services');
const { jwtAuth, team } = require('../middlewares');
const joi = require('@hapi/joi');
const compose = require('koa-compose');

const router = new Router({
  prefix: '/reminders'
});

const createSchema = joi.object({
  date: joi.date().required(),
  taskId: joi.number().required()
});

const updateSchema = joi.object({
  date: joi.date().required(),
  taskId: joi.number().required()
});

const updateSettingsSchema = joi.object({
  allowSendToEmail: joi.boolean(),
  allowSendToPush: joi.boolean()
});

router.get('/settings', compose([jwtAuth(), team()]), async ctx => {
  try {
    const reminderSettings = await ReminderService.getReminderSettings(
      ctx.state.user.id
    );

    ctx.ok({ reminderSettings: reminderSettings });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    const reminder = await ReminderService.createReminder(data);

    ctx.ok({ reminder: reminder });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.put('/settings', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await updateSettingsSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    const reminderSettings = await ReminderService.updateReminderSettings(data);

    ctx.ok(reminderSettings);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.put('/:id', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const id = ctx.params.id;

  ctx.test(id, 400, 'No ff id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.id = id;

    const reminder = await ReminderService.updateReminder(data);

    ctx.ok(reminder);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.delete('/:id', compose([jwtAuth(), team()]), async ctx => {
  const id = ctx.params.id;

  ctx.test(id, 400, 'No ff id');

  try {
    await ReminderService.deleteReminder({
      userId: ctx.state.user.id,
      id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

module.exports = router;
