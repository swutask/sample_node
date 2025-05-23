'use strict';

const Router = require('koa-router');
const { TaskService, DuplicationService } = require('../services');
const joi = require('@hapi/joi');
const { jwtAuth, team } = require('../middlewares');
const compose = require('koa-compose');
const { rules } = require('../libs/joi');
const TaskController = require('../controllers/TaskController');
const ActivityController = require('../controllers/ActivityController');
const { pagination } = require('../middlewares/index');

const router = new Router({
  prefix: '/tasks'
});

const createSchema = joi.object({
  title: joi.string().required(),
  subTitle: joi.string().allow(''),
  additionalInfo: joi.string().allow('', null),
  isUrgent: joi.boolean(),
  urgentStatus: joi.number().allow(null, 1, 2, 3, 4),
  storyPoints: joi.number().allow(null, 1, 2, 3, 5, 8),
  taskRowId: joi.number().required(),
  projectId: joi.number(),
  parentId: joi.number(),
  order: joi.number(),
  tagIds: joi.array(),
  isSample: joi.boolean(),
  endDate: joi.date()
    .when('rrule', {
      is: joi.exist(),
      then: joi.required(),
      otherwise: joi.allow('', null)
    }),
  startDate: joi.date()
    .when('rrule', {
      is: joi.exist(),
      then: joi.required(),
      otherwise: joi.allow('', null)
    }),
  isToday: joi.boolean(),
  teamMembers: joi.array().items(joi.number()),
  rrule: joi.string().allow(null)
});

const updateSchema = joi.object({
  title: joi.string(),
  subTitle: joi.string().allow(''),
  additionalInfo: joi.string().allow('', null),
  isUrgent: joi.boolean(),
  urgentStatus: joi.number().allow(null, 1, 2, 3, 4),
  storyPoints: joi.number().allow(null, 1, 2, 3, 5, 8),
  taskRowId: joi.number(),
  newBookId: joi.number(),
  projectId: joi.number().allow(null),
  endDate: joi.date().allow(null),
  startDate: joi.date().allow(null),
  rrule: joi.string().allow(null)
});

const updatePreviewImageSchema = joi.object({
  imageId: joi.number().required(),
  showInModal: joi.boolean(),
  showInCard: joi.boolean()
});

const orderSchema = joi.object({
  ids: joi.array().required()
});

const idSchema = joi.object({
  newBookId: joi.number().required()
});

const updateTagName = joi.object({
  name: joi.string().required().allow('')
});

const assignMember = joi.object({
  memberId: joi.number().allow(null)
});

const unassignMember = joi.object({
  memberIds: rules.numericStringList().required()
});

const bookIdsSchema = joi.object({
  bookIds: joi.array().items(joi.number()).required()
});

const deleteTasksSchema = joi.object({
  taskIds: rules.numericStringList().required()
});

const removeTagsSchema = joi.object({
  tagIds: rules.numericStringList().required()
});

const rowSchema = joi.object({
  title: joi.string(),
  color: joi.number().allow(null)
});

router.delete('/books/:bookId', compose([jwtAuth(), team({ required: true })]), async ctx => {
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team.id;
  const bookId = parseInt(ctx.params.bookId);

  try {
    const { taskIds } = await deleteTasksSchema.validateAsync(ctx.query, {
      stripUnknown: true
    });

    await TaskService.deleteByIds({
      ids: taskIds.split(',').map((id) => parseInt(id)),
      userId,
      teamId,
      bookId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get(
  '/all',
  compose([
    jwtAuth(),
    team()
  ]),
  TaskController.getAllByBookIds
);

router.get(
  '/google-calendar-events',
  compose([
    jwtAuth(),
    team()
  ]),
  TaskController.getAllCalendarTasks
);

router.get('/rows/:bookId', compose([jwtAuth(), team()]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);

  try {
    const taskRows = await TaskService.getRows({
      bookId: bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok({ taskRows });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/task/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const body = ctx.request.body;

  ctx.test(bookId, 400, 'No bookId');

  try {
    const data = await createSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    const task = await TaskService.create(data);

    ctx.ok(task);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/duplicate/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No id');
  ctx.test(bookId, 400, 'No bookId');

  try {
    const task = await DuplicationService.duplicateTask({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      oldBookId: bookId,
      newBookId: bookId,
      id: id
    });

    ctx.ok(task);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/row/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const body = ctx.request.body;

  ctx.test(bookId, 400, 'No bookId');

  try {
    const data = await rowSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    const taskRow = await TaskService.createRow(data);

    ctx.ok(taskRow);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/move-to/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);
  const body = ctx.request.body;

  ctx.test(id, 400, 'No id');
  ctx.test(bookId, 400, 'No bookId');

  try {
    const { newBookId } = await idSchema.validateAsync(body, {
      stripUnknown: true
    });

    const task = await DuplicationService.moveTaskToBook({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      oldBookId: bookId,
      newBookId: newBookId,
      id: id
    });

    ctx.ok(task);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete(
  '/:taskId/move-to',
  jwtAuth(),
  TaskController.revertMoveToBook
);

router.post('/complete/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: true })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    await TaskService.complete({
      id: id,
      bookId: bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/assign/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);
  const body = ctx.request.body;

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    const { memberId } = await assignMember.validateAsync(body, {
      stripUnknown: true
    });

    await TaskService.assignMember({
      id: id,
      bookId,
      memberId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/assign/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    const { memberIds } = await unassignMember.validateAsync(ctx.query, {
      stripUnknown: true
    });

    await TaskService.unassignMember({
      taskId: id,
      bookId,
      memberIds: memberIds.split(',').map((id) => parseInt(id)),
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/task/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    await TaskService.update(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/preview-image/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    const data = await updatePreviewImageSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    await TaskService.updatePreview(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/row/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(id, 400, 'No id');

  try {
    const data = await rowSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    await TaskService.updateRow(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/task/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No id');
  ctx.test(bookId, 400, 'No bookId');

  try {
    await TaskService.delete({
      id,
      bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/row/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No id');
  ctx.test(bookId, 400, 'No bookId');

  try {
    await TaskService.deleteRow({
      id,
      bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/order/task/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(bookId, 400, 'No book id');

  try {
    const data = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    await TaskService.order(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/home-order', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.teamId = ctx.state.team?.id;

    await TaskService.changeHomeOrder(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/order/row/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(bookId, 400, 'No book id');

  try {
    const data = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    await TaskService.orderRow(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/tags', compose([jwtAuth(), team()]), async ctx => {
  const books = ctx.query.books;

  try {
    const bookIds = books.split(',');
    const data = await bookIdsSchema.validateAsync({ bookIds });

    const tags = await TaskService.getTags({
      bookIds: data.bookIds,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok({ tags: tags });
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/tag/:tagId/:taskId/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const tagId = parseInt(ctx.params.tagId);
  const taskId = parseInt(ctx.params.taskId);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(tagId, 400, 'No tag id');
  ctx.test(taskId, 400, 'No task id');
  ctx.test(bookId, 400, 'No book id');

  try {
    await TaskService.toggleTag({
      tagId,
      taskId,
      bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/tag/:taskId/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const taskId = parseInt(ctx.params.taskId);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(taskId, 400, 'No task id');
  ctx.test(bookId, 400, 'No book id');

  try {
    const { tagIds } = await removeTagsSchema.validateAsync(ctx.query, {
      stripUnknown: true
    });

    await TaskService.removeTags({
      tagIds: tagIds.split(',').map((id) => parseInt(id)),
      taskId,
      bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/tag/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No tag id');
  ctx.test(bookId, 400, 'No book id');

  try {
    const { name } = await updateTagName.validateAsync(body, {
      stripUnknown: true
    });

    await TaskService.updateTagName({
      id: id,
      name: name,
      bookId: bookId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get(
  '/:taskId/activities',
  compose([
    jwtAuth(),
    team({ required: true }),
    pagination()
  ]),
  ActivityController.getTaskActivities
);

router.delete(
  '/:taskId/subscription',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  TaskController.unsubscribe
);

router.post(
  '/:taskId/subscription',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  TaskController.subscribe
);

router.get('/:taskId',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  TaskController.getTaskById
);

module.exports = router;
