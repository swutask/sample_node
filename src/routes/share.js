'use strict';

const Router = require('koa-router');
const { SharingService } = require('../services');
const { jwtAuth, team } = require('../middlewares');
const joi = require('@hapi/joi');
const compose = require('koa-compose');

const router = new Router({
  prefix: '/share'
});

const schema = joi.object({
  mode: joi.string().required(),
  isActive: joi.boolean().required()
});

router.post('/:projectId', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const projectId = parseInt(ctx.params.projectId);

  ctx.test(projectId, 400, 'No projectId');

  try {
    const data = await schema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.projectId = projectId;
    data.teamId = ctx.state.team?.id;

    const share = await SharingService.getShareLink(data);
    ctx.ok(share);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/:id', async ctx => {
  const id = ctx.params.id;
  ctx.test(id, 400, 'No id');

  try {
    const share = await SharingService.getById(id);
    ctx.ok(share);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/project/:id', async ctx => {
  const id = ctx.params.id;
  ctx.test(id, 400, 'No id');

  try {
    const share = await SharingService.getByProjectId(id);
    ctx.ok(share);
  } catch (err) {
    ctx.bad(400, err);
  }
});

module.exports = router;
