'use strict';

const Router = require('koa-router');
const { ClientService, UserService } = require('../services');
const joi = require('@hapi/joi');
const { jwtAuth, team } = require('../middlewares');
const compose = require('koa-compose');
const router = new Router({
  prefix: '/clients'
});

const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  color: joi.string(),
  teamId: joi.number().required(),
  signature: joi.string().required()
});

const acceptSchema = joi.object({
  email: joi.string().email().required(),
  signature: joi.string().required(),
  teamId: joi.number().required()
});

const inviteClientsSchema = joi.object({
  emails: joi.array().items(joi.string().email()).required(),
  bookIds: joi.array().items(joi.number())
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const result = await ClientService.getClients({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(result);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/books', jwtAuth(), async ctx => {
  try {
    const result = await ClientService.getTeamsAndBooks({
      userId: ctx.state.user.id
    });

    ctx.ok({ teams: result });
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

    const user = await ClientService.registerClient(data);
    const token = await UserService.createTokenForUser(user);

    ctx.ok({ token: token });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/accept-invite', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await acceptSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ClientService.acceptInviteClient({
      userId: ctx.state.user.id,
      ...data
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/send-invites', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await inviteClientsSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ClientService.inviteClients({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      ...data
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/add-access-to-book/:clientUserId/:bookId', compose([jwtAuth(), team()]), async ctx => {
  const clientUserId = ctx.params.clientUserId;
  const bookId = ctx.params.bookId;

  try {
    await ClientService.AddClientAccessToBook({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      clientUserId,
      bookId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/remove-access-from-book/:clientUserId/:bookId', compose([jwtAuth(), team()]), async ctx => {
  const clientUserId = ctx.params.clientUserId;
  const bookId = ctx.params.bookId;

  try {
    await ClientService.removeClientAccessFromBook({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      clientUserId,
      bookId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/remove/:clientId', compose([jwtAuth(), team()]), async ctx => {
  const clientId = ctx.params.clientId;

  ctx.test(clientId, 400, 'No client id');

  try {
    await ClientService.deleteClient({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      clientId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/remove-temporary-client/:id', compose([jwtAuth(), team()]), async ctx => {
  const id = ctx.params.id;

  ctx.test(id, 400, 'No temporary client id');

  try {
    await ClientService.deleteTemporaryClient({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
