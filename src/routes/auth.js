'use strict';

const Router = require('koa-router');
const { UserService } = require('../services');
const oauth = require('./oauth');
const { jwtAuth } = require('../middlewares');
const joi = require('@hapi/joi');

const router = new Router({
  prefix: '/auth'
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required()
});

const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  color: joi.string()
});

const emailSchema = joi.object({
  email: joi.string().email().required()
});

const resetSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required(),
  expire: joi.string().required(),
  signature: joi.string().required()
});

const changeSchema = joi.object({
  oldPassword: joi.string().min(6).max(64).required(),
  newPassword: joi.string().min(6).max(64).required()
    .invalid(joi.ref('oldPassword'))
    .error(new Error('Passwords are same'))
});

router.post('/login', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await loginSchema.validateAsync(body, {
      stripUnknown: true
    });

    const user = await UserService.getUserByEmailAndPassword(data);
    const token = await UserService.createTokenForUser(user);

    ctx.ok({ token: token });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/register', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await registerSchema.validateAsync(body, {
      stripUnknown: true
    });

    const user = await UserService.createUser(data);
    const token = await UserService.createTokenForUser(user);

    ctx.ok({ token: token });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/logout', async ctx => {
  ctx.ok();
});

router.post('/recover', async ctx => {
  const body = ctx.request.body;

  try {
    const { email } = await emailSchema.validateAsync(body, {
      stripUnknown: true
    });

    await UserService.recoverPassword(email);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/reset', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await resetSchema.validateAsync(body, {
      stripUnknown: true
    });

    const user = await UserService.resetPassword(data);
    const token = await UserService.createTokenForUser(user);

    ctx.ok({ token: token });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/password', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await changeSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.user = ctx.state.user;

    await UserService.changePassword(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.use(oauth.routes());

module.exports = router;
