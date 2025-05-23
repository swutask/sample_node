'use strict';

const Router = require('koa-router');
const { NotificationService } = require('../services');
const NotificationController = require('../controllers/NotificationController');
const { jwtAuth, team, pagination } = require('../middlewares');
const compose = require('koa-compose');
const joi = require('@hapi/joi');

const idsSchema = joi.object({
  ids: joi.array().required()
});

const router = new Router({
  prefix: '/notifications'
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const notifications = await NotificationService.getAll({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok({ notifications });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/latest-activity/:bookId', compose([jwtAuth(), team(), pagination()]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(bookId, 400, 'No bookId');

  try {
    const data = await NotificationService.getByBookId({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      bookId: bookId,
      limit: ctx.pagination.limit,
      page: ctx.pagination.page
    });

    ctx.ok(data);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/:id', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);

  ctx.test(id, 400, 'No id');

  try {
    await NotificationService.delete({
      id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete(
  '/',
  compose([
    jwtAuth(),
    team({
      hasFullAccess: false,
      required: true
    })
  ]),
  NotificationController.deleteManny
);

router.put('/', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const { ids } = await idsSchema.validateAsync(body, {
      stripUnknown: true
    });

    await NotificationService.updateStatus({
      ids: ids,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
