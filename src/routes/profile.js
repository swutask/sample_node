'use strict';

const Router = require('koa-router');
const { jwtAuth } = require('../middlewares');
const { UserService } = require('../services');
const OnboardingController = require('../controllers/OnboardingController');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const multer = require('@koa/multer');
const { getNanoSec } = require('../utils');
const path = require('path');
const { team } = require('../middlewares');

const router = new Router({
  prefix: '/profile'
});

const updateSchema = joi.object({
  firstName: joi.string(),
  lastName: joi.string(),
  email: joi.string().email(),
  showUpgradeToPro: joi.number(),
  showBookOnboarding: joi.boolean(),
  showProjectOnboarding: joi.boolean(),
  location: joi.string().allow(null, ''),
  timezone: joi.string().allow(null, ''),
  position: joi.string().allow(null, '')
});

const deleteSchema = joi.object({
  isRestore: joi.boolean().required()
});

const restoreSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required()
});

const updateQuickThoughtsSchema = joi.object({
  text: joi.string().allow(null, '').required()
});

router.get('/', jwtAuth(), async ctx => {
  try {
    const profile = UserService.getProfile(ctx.state.user);
    ctx.ok(profile);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/quick-thoughts', jwtAuth(), async ctx => {
  try {
    const quickThoughts = await UserService.getQuickThoughts(ctx.state.user.id);

    ctx.ok({ text: quickThoughts });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/quick-thoughts', jwtAuth(), async ctx => {
  try {
    const body = ctx.request.body;

    const { text } = await updateQuickThoughtsSchema.validateAsync(body, {
      stripUnknown: true
    });

    const quickThoughts = await UserService.updateQuickThoughts(ctx.state.user.id, text);

    ctx.ok(quickThoughts);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/', jwtAuth(), async ctx => {
  const userId = ctx.state.user.id;
  const body = ctx.request.body;

  try {
    const values = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });
    values.userId = userId;

    await UserService.updateProfile(values);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

// TODO use patch method
router.post(
  '/onboarding',
  jwtAuth(),
  OnboardingController.updateOnboarding
);

router.patch(
  '/onboarding-task-settings',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  OnboardingController.updateTaskSettings
);

router.get(
  '/onboarding-task-settings',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  OnboardingController.getTaskSettings
);

router.delete('/', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const { isRestore } = await deleteSchema.validateAsync(body, {
      stripUnknown: true
    });

    await UserService.delete({
      userId: ctx.state.user.id,
      isRestore: isRestore
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/restore', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await restoreSchema.validateAsync(body, {
      stripUnknown: true
    });

    const token = await UserService.restore(data);
    ctx.ok({ token });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/avatar',
  compose([
    jwtAuth(),
    multer({ storage: multer.memoryStorage() }).any()
  ]),
  async ctx => {
    const files = ctx.files;

    ctx.test(files.length === 1, 400, 'Only 1 file acceptable');

    const file = files[0];
    const name = Date.now() +
      '_' +
      getNanoSec() +
      path.extname(file.originalname);
    const size = file.size;
    const mimeType = file.mimetype;

    try {
      const data = await UserService.uploadAvatar({
        size: size,
        mimeType: mimeType,
        body: file.buffer,
        name: name,
        userId: ctx.state.user.id
      });

      ctx.ok({ url: data.url, id: data.id });
    } catch (err) {
      ctx.bad(400, err, { code: err.code ?? 0 });
    }
  });

module.exports = router;
