'use strict';

const Router = require('koa-router');
const { jwtAuth, team } = require('../middlewares');
const ProjectService = require('../services/ProjectService');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const AttachmentController = require('../controllers/AttachmentController');

const router = new Router({
  prefix: '/projects'
});

const sendByEmailSchema = joi.object({
  projectId: joi.number().required(),
  email: joi.string().email().required(),
  html: joi.string().required()
});

const htmlSchema = joi.object({
  html: joi.string().required()
});

const createSchema = joi.object({
  title: joi.string().required(),
  icon: joi.string().required(),
  bookId: joi.number().required(),
  parentId: joi.number().allow(null),
  body: joi.string().allow('', null)
});

const updateSchema = joi.object({
  title: joi.string(),
  icon: joi.string(),
  body: joi.string().allow('', null),
  document: joi.object({
    content: joi.array(),
    type: joi.string()
  }),
  isLocked: joi.boolean(),
  bookId: joi.number(),
  parentId: joi.number().allow(null)
});

const deleteSchema = joi.object({
  id: joi.number().required(),
  permanent: joi.boolean()
});

const orderSchema = joi.object({
  ids: joi.array().required()
});

router.get('/size/:projectId', compose([jwtAuth(), team()]), async ctx => {
  const projectId = parseInt(ctx.params.projectId);

  ctx.test(projectId, 400, 'No projectId');

  try {
    const size = await ProjectService.getSize({
      projectId: projectId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok({ size: size });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/size/:projectId/:shareId', async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;

  ctx.test(projectId, 400, 'No projectId');
  ctx.test(shareId, 400, 'No shareId');

  try {
    const size = await ProjectService.getSizeOfSharedProject({
      projectId: projectId,
      shareId: shareId
    });

    ctx.ok({ size: size });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const projects = await ProjectService.getAll({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(projects);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/project/:projectId', compose([jwtAuth(), team()]), async ctx => {
  const projectId = parseInt(ctx.params.projectId);

  ctx.test(projectId, 400, 'No projectId');

  try {
    const project = await ProjectService.getProject({
      id: projectId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(project);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/:projectId/:shareId', async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;

  ctx.test(projectId, 400, 'No projectId');
  ctx.test(shareId, 400, 'No shareId');

  try {
    const project = await ProjectService.getShared({
      projectId: projectId,
      shareId: shareId
    });

    ctx.ok(project.get());
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/deleted', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  try {
    const projects = await ProjectService.getDeletedProjects({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok(projects);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    const project = await ProjectService.create(data);

    ctx.ok(project);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/:projectId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const projectId = parseInt(ctx.params.projectId);

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = projectId;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await ProjectService.update(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/:projectId/:shareId', async ctx => {
  const body = ctx.request.body;
  const shareId = ctx.params.shareId;
  const projectId = parseInt(ctx.params.projectId);

  ctx.test(projectId, 400, 'No id');
  ctx.test(shareId, 400, 'No share id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = projectId;
    data.shareId = shareId;

    await ProjectService.updateShared(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/:projectId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const projectId = parseInt(ctx.params.projectId);

  try {
    const data = await deleteSchema.validateAsync(
      {
        id: projectId,
        permanent: body.permanent
      }
    );

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await ProjectService.delete(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/restore/:projectId', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  const projectId = parseInt(ctx.params.projectId);

  ctx.test(projectId, 400, 'No id');

  try {
    await ProjectService.restore({
      id: projectId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/email', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const { projectId, email, html } = await sendByEmailSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ProjectService.sendByEmail({
      projectId: projectId,
      email: email,
      html: html,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/email/share', async ctx => {
  const body = ctx.request.body;
  const shareId = body.shareId;

  ctx.test(shareId, 400, 'No shareId');

  try {
    const { projectId, email, html } = await sendByEmailSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ProjectService.sendSharedByEmail({
      projectId: projectId,
      email: email,
      html: html,
      shareId: shareId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/order', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;

  try {
    const { ids } = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ProjectService.order({
      ids: ids,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/export/pdf/:projectId', compose([jwtAuth(), team()]), async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const body = ctx.request.body;

  ctx.test(projectId, 400, 'No projectId');

  try {
    const { html } = await htmlSchema.validateAsync(body, {
      stripUnknown: true
    });

    const buffer = await ProjectService.exportPdf({
      userId: ctx.state.user.id,
      projectId: projectId,
      html,
      teamId: ctx.state.team?.id
    });

    ctx.type = 'application/pdf';
    ctx.body = buffer;
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/export/pdf/:projectId/:shareId', async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;
  const body = ctx.request.body;

  ctx.test(shareId, 400, 'No shareId');
  ctx.test(projectId, 400, 'No projectId');

  try {
    const { html } = await htmlSchema.validateAsync(body, {
      stripUnknown: true
    });
    const buffer = await ProjectService.exportSharedProjectAsPdf({
      html,
      shareId: shareId,
      projectId: projectId
    });

    ctx.type = 'application/pdf';
    ctx.body = buffer;
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/export/docx/:projectId', compose([jwtAuth(), team()]), async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const body = ctx.request.body;

  ctx.test(projectId, 400, 'No projectId');

  try {
    const { html } = await htmlSchema.validateAsync(body, {
      stripUnknown: true
    });

    const buffer = await ProjectService.exportDocx({
      userId: ctx.state.user.id,
      projectId: projectId,
      html,
      teamId: ctx.state.team?.id
    });

    ctx.ok(buffer);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/export/docx/:projectId/:shareId', async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;
  const body = ctx.request.body;

  ctx.test(shareId, 400, 'No shareId');
  ctx.test(projectId, 400, 'No projectId');

  try {
    const { html } = await htmlSchema.validateAsync(body, {
      stripUnknown: true
    });

    const buffer = await ProjectService.exportSharedProjectAsDocx({
      html,
      shareId: shareId,
      projectId: projectId
    });

    ctx.ok(buffer);
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.patch(
  '/:projectId/attachments/:attachmentId/share/:shareId',
  AttachmentController.updateProjectShared
);

module.exports = router;
