'use strict';

const Router = require('koa-router');
const {
  jwtAuth,
  team
} = require('../middlewares');

const joi = require('@hapi/joi');
const compose = require('koa-compose');
const { FilterService } = require('../services');

const router = new Router({
  prefix: '/filters'
});

const createSchema = joi.object({
  bookId: joi.number(),
  name: joi.string().required(),
  taskFilter: joi.string().required()
});

const updateSchema = joi.object({
  id: joi.number().required(),
  bookId: joi.number(),
  name: joi.string(),
  taskFilter: joi.string().allow('', null)
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const filters = await FilterService.get({
      userId: ctx.state.user.id
    });

    ctx.ok({ filters });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const body = ctx.request.body;

    const { taskFilter, name, bookId } = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    const filter = await FilterService.create({
      taskFilter,
      name,
      bookId,
      userId: ctx.state.user.id
    });

    ctx.ok({ filter });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.patch('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const body = ctx.request.body;
    const userId = ctx.state.user.id;

    const { id, bookId, taskFilter, name } = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    await FilterService.update({
      id,
      name,
      taskFilter,
      bookId,
      userId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/:id', compose([jwtAuth(), team()]), async ctx => {
  try {
    const id = ctx.params.id;
    const bookId = ctx.query.bookId;
    const userId = ctx.state.user.id;

    await FilterService.delete({
      id,
      bookId,
      userId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
