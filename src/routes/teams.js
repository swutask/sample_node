'use strict';

const Router = require('koa-router');
const { TeamService, UserService, PlanService, BookService } = require('../services');
const { jwtAuth, team, pagination } = require('../middlewares');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const multer = require('@koa/multer');
const { getNanoSec } = require('../utils');
const path = require('path');

const router = new Router({
  prefix: '/teams'
});

const emailSchema = joi.object({
  email: joi.string().email().required()
});

const registerSchema = joi.object({
  teamName: joi.string().required(),
  inviteLink: joi.string().max(10),
  email: joi.string().email().required(),
  password: joi.string().min(6).max(64).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  color: joi.string(),
  size: joi.number().allow(null)
});

const teamNameSchema = joi.object({
  teamName: joi.string().required(),
  inviteLink: joi.string().max(10),
  size: joi.number().allow(null)
});

const acceptInviteSchema = joi.object({
  signature: joi.string(),
  expire: joi.string(),
  inviteLink: joi.string().max(10),
  email: joi.string().email().required(),
  teamId: joi.number().required()
});

const acceptInviteAndCreateUserSchema = joi.object({
  signature: joi.string(),
  expire: joi.string(),
  inviteLink: joi.string().max(10),
  email: joi.string().email().required(),
  teamId: joi.number().required(),
  password: joi.string().min(6).max(64).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  color: joi.string()
});

const inviteMembersSchema = joi.object({
  emails: joi.array().items(joi.string().email()).required(),
  bookIds: joi.array().items(joi.number())
});

const verifyCodeSchema = joi.object({
  code: joi.number().required(),
  email: joi.string().email().required()
});

const shareBookWithMemberSchema = joi.object({
  memberId: joi.number().required(),
  bookId: joi.number().required()
});

const updateMemberRoleSchema = joi.object({
  memberId: joi.number().required(),
  roleName: joi.string().required()
});

const updateNameSchema = joi.object({
  name: joi.string().required()
});

router.get('/', jwtAuth(), async ctx => {
  try {
    const team = await TeamService.getTeamByUserId({
      userId: ctx.state.user.id
    });

    ctx.ok(team);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/members', compose([jwtAuth(), team(), pagination()]), async ctx => {
  try {
    const members = await TeamService.getAllMembers({
      teamId: ctx.state.team?.id,
      search: ctx.query.search,
      orderColumn: ctx.query.column,
      orderDirection: ctx.query.direction,
      limit: ctx.pagination.limit,
      page: ctx.pagination.page
    });

    ctx.ok(members);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/temporary/members', compose([jwtAuth(), team()]), async ctx => {
  try {
    const members = await TeamService.getTemporaryMembers({
      teamId: ctx.state.team?.id,
      search: ctx.query.search
    });

    ctx.ok(members);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/member', compose([jwtAuth(), team({ checkSubscription: false })]), async ctx => {
  try {
    const member = await TeamService.getTeamMember({
      teamId: ctx.state.team?.id,
      userId: ctx.state.user.id
    });

    ctx.ok({ member: member });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/inviteLink/:id', async ctx => {
  try {
    const team = await TeamService.getTeamByInviteLink({
      inviteLink: ctx.params.id
    });

    ctx.ok({ team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/createInviteLink', async ctx => {
  try {
    const inviteLink = await TeamService.createInviteLink();

    ctx.ok({ inviteLink: inviteLink });
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

    const result = await TeamService.register(data);
    const token = await UserService.createTokenForUser(result.user);

    ctx.ok({
      team: result.team,
      token: token
    });
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/createTeam', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await teamNameSchema.validateAsync(body, {
      stripUnknown: true
    });

    const team = await TeamService.createTeam({
      teamName: data.teamName,
      inviteLink: data.inviteLink,
      userId: ctx.state.user.id,
      size: data.size
    });

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/checkEmail', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await emailSchema.validateAsync(body, {
      stripUnknown: true
    });

    const result = await TeamService.checkEmail(data);

    ctx.ok(result);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/sendVerificationCode', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await emailSchema.validateAsync(body, {
      stripUnknown: true
    });

    await TeamService.sendVerificationCode(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/verifyCode', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await verifyCodeSchema.validateAsync(body, {
      stripUnknown: true
    });

    await TeamService.verifyCode(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/inviteMembers', compose([jwtAuth(), team({ role: ['admin', 'super user'] })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await inviteMembersSchema.validateAsync(body, {
      stripUnknown: true
    });

    await PlanService.checkMembers(ctx.state.user.id, ctx.state.team?.id);

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await TeamService.inviteMembers(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/acceptInvite', jwtAuth(), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await acceptInviteSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;

    const team = await TeamService.acceptInvite(data);

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/acceptInviteAndCreateUser', async ctx => {
  const body = ctx.request.body;

  try {
    const data = await acceptInviteAndCreateUserSchema.validateAsync(body, {
      stripUnknown: true
    });

    const result = await TeamService.acceptInviteAndCreateUser(data);
    const token = await UserService.createTokenForUser(result.user);

    ctx.ok({
      team: result.team,
      token: token
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/upload',
  compose([
    jwtAuth(),
    team({ role: ['admin'] }),
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
      const data = await TeamService.uploadLogo({
        size: size,
        mimeType: mimeType,
        body: file.buffer,
        name: name,
        userId: ctx.state.user.id,
        teamId: ctx.state.team?.id
      });
      ctx.ok({ url: data.url, id: data.id });
    } catch (err) {
      ctx.bad(400, err, { code: err.code ?? 0 });
    }
  });

router.delete('/logo',
  compose([
    jwtAuth(),
    team(['admin'])
  ]),
  async (ctx) => {
    const teamId = ctx.state.team.id;

    try {
      await TeamService.deleteLogo({
        teamId
      });
      ctx.ok();
    } catch (err) {
      ctx.bad(400, err, { code: err.code ?? 0 });
    }
  }
);

router.post('/member/:memberId/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const memberId = parseInt(ctx.params.memberId);

  try {
    const data = await shareBookWithMemberSchema.validateAsync({
      memberId: memberId,
      bookId: bookId
    }, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;
    data.userId = ctx.state.user.id;

    const team = await BookService.addMemberToBook(data);

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/member/:memberId', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);

  ctx.test(memberId, 400, 'No member id');

  try {
    const team = await TeamService.deleteMember({
      memberId: memberId,
      teamId: ctx.state.team?.id
    });

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/member/temporary/:memberId', compose([jwtAuth(), team({ role: ['admin', 'super user'] })]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);

  ctx.test(memberId, 400, 'No member id');

  try {
    const team = await TeamService.deleteTemporaryMember({
      memberId: memberId,
      teamId: ctx.state.team?.id
    });

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/member-access/:memberId/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const memberId = parseInt(ctx.params.memberId);

  try {
    const data = await shareBookWithMemberSchema.validateAsync({
      memberId: memberId,
      bookId: bookId
    }, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;
    data.userId = parseInt(ctx.state.user.id);

    const team = await TeamService.deleteMemberFromBook(data);

    ctx.ok({ team: team });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/rename', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await updateNameSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;
    data.userId = ctx.state.user.id;

    const result = await TeamService.updateName(data);

    ctx.ok(result);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/member/:memberId', compose([jwtAuth(), team({ role: ['admin', 'super user'] })]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);
  const body = ctx.request.body;

  try {
    const data = await updateMemberRoleSchema.validateAsync({
      memberId: memberId,
      roleName: body.roleName
    }, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;
    data.userId = ctx.state.user.id;

    await TeamService.updateMemberRole(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/temporary/member/:memberId', compose([jwtAuth(), team({ role: ['admin', 'super user'] })]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);
  const body = ctx.request.body;

  try {
    const data = await updateMemberRoleSchema.validateAsync({
      memberId: memberId,
      roleName: body.roleName
    }, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;
    data.userId = ctx.state.user.id;

    await TeamService.updateTemporaryMemberRole(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/member/billing-access/:memberId', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);
  const body = ctx.request.body;

  try {
    await TeamService.updateBillingAccess({
      memberId: memberId,
      teamId: ctx.state.team?.id,
      hasBillingAccess: body.hasBillingAccess
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
