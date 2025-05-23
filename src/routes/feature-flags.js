'use strict';

const Router = require('koa-router');
const { FeatureFlagService } = require('../services');
const { jwtAuth } = require('../middlewares');
const joi = require('@hapi/joi');

const router = new Router({
  prefix: '/feature-flags'
});

const createSchema = joi.object({
  name: joi.string().required(),
  active: joi.boolean().required()
});

const updateSchema = joi.object({
  active: joi.boolean().required()
});

router.get('/', async ctx => {
  try {
    const ff = await FeatureFlagService.get();

    ctx.ok({ featureFlags: ff });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/', jwtAuth('admin'), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    const ff = await FeatureFlagService.create(data);

    ctx.ok({ featureFlag: ff });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.put('/:id', jwtAuth('admin'), async ctx => {
  const body = ctx.request.body;
  const id = ctx.params.id;

  ctx.test(id, 400, 'No ff id');

  try {
    const { active } = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    const ff = await FeatureFlagService.update({
      id,
      active
    });

    ctx.ok(ff);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.delete('/:id', jwtAuth('admin'), async ctx => {
  const id = ctx.params.id;

  ctx.test(id, 400, 'No ff id');

  try {
    await FeatureFlagService.delete(id);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

module.exports = router;
