'use strict';

const Router = require('koa-router');
const { TemplateService } = require('../services');
const joi = require('@hapi/joi');
const { jwtAuth, team } = require('../middlewares');
const multer = require('@koa/multer');
const compose = require('koa-compose');
const { getNanoSec } = require('../utils');
const path = require('path');

const router = new Router({
  prefix: '/templates'
});

const getSchema = joi.object({
  type: joi.string().valid('all', 'private', 'shared').required()
});

const createSchema = joi.object({
  title: joi.string().required(),
  content: joi.string().required(),
  projectId: joi.number().required(),
  projectTitle: joi.string().required(),
  isShared: joi.boolean().required()
});

const updateSchema = joi.object({
  title: joi.string().required(),
  isShared: joi.boolean().required()
});

const pasteSchema = joi.object({
  projectId: joi.number().required(),
  templateId: joi.number().required()
});

const orderSchema = joi.object({
  ids: joi.array().required()
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const { type } = await getSchema.validateAsync(ctx.query, {
      stripUnknown: true
    });

    const templates = await TemplateService.getTemplates({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      type: type
    });

    ctx.ok({ templates: templates });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/', compose([
  jwtAuth(),
  team(),
  multer({
    storage: multer.memoryStorage()
  }).any()
]), async ctx => {
  const files = ctx.files;
  const body = ctx.request.body;

  ctx.test(files.length === 1, 400, 'Only 1 file acceptable');

  const file = files[0];
  const name = Date.now() +
    '_' +
    getNanoSec() +
    path.extname(file.originalname);

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.buffer = file.buffer;
    data.name = name;

    const template = await TemplateService.create(data);

    ctx.ok({ template: template });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/:id', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const id = parseInt(ctx.params.id);

  ctx.test(id, 400, 'No id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await TemplateService.update(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/:id', jwtAuth(), async ctx => {
  const id = parseInt(ctx.params.id);

  ctx.test(id, 400, 'No id');

  try {
    await TemplateService.delete({
      id: id,
      userId: ctx.state.user.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/order', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    await TemplateService.order(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/paste', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await pasteSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    const result = await TemplateService.paste(data);
    ctx.ok(result);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
