'use strict';

const Router = require('koa-router');
const {
  jwtAuth,
  team
} = require('../middlewares');
const {
  BookService,
  PlanService,
  TeamService,
  DuplicationService
} = require('../services');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const BookFolderService = require('../services/BookFolderService');
const ProjectService = require('../services/ProjectService');
const { validators } = require('../libs/joi');
const { pagination } = require('../middlewares/index');
const ActivityController = require('../controllers/ActivityController');
const ChatController = require('../controllers/ChatController');
const MemberController = require('../controllers/MemberController');

const router = new Router({
  prefix: '/books'
});

const createSchema = joi.object({
  title: joi.string().required(),
  subTitle: joi.string().allow(null, ''),
  color: joi.string().allow(null),
  icon: joi.string(),
  favorite: joi.boolean(),
  isSample: joi.boolean(),
  members: joi.array().items(joi.number()),
  bookFolderId: joi.number().allow(null),
  order: joi.number()
});

const createLinkSchema = joi.object({
  name: joi.string().required(),
  description: joi.string().allow('', null),
  url: joi.string().required()
});

const createSectionSchema = joi.object({
  title: joi.string().required(),
  icon: joi.string()
});

const updateSchema = joi.object({
  id: joi.number().required(),
  title: joi.string(),
  subTitle: joi.string().allow(null, ''),
  color: joi.string().allow(null),
  icon: joi.string().allow(null),
  favorite: joi.boolean(),
  archivedAt: joi.string().allow(null),
  bookFolderId: joi.number().allow(null)
});

const deleteSchema = joi.object({
  id: joi.number().required(),
  permanent: joi.boolean()
});

const idsSchema = joi.object({
  bookId: joi.number(),
  bookFolderId: joi.number().when('bookId', {
    not: joi.exist(),
    then: joi.required(),
    otherwise: validators.shouldNotExist('any.unknown')
  })
});
const orderSchema = joi.object({
  ids: joi.array().items(idsSchema).required()
});

const createFolderSchema = joi.object({
  name: joi.string().required(),
  icon: joi.string(),
  favorite: joi.boolean(),
  order: joi.number()
});

const updateFolderSchema = joi.object({
  name: joi.string(),
  icon: joi.string(),
  favorite: joi.boolean(),
  archivedAt: joi.date().allow(null)
});

const deleteFolderSchema = joi.object({
  permanent: joi.boolean()
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    let books = [];
    let folders = [];

    if (ctx.state.team) {
      books = await TeamService.getTeamBooks({
        userId: ctx.state.user.id,
        teamId: ctx.state.team.id
      });
      folders = await BookFolderService.getAll({
        userId: ctx.state.user.id,
        teamId: ctx.state.team.id
      });
    } else {
      books = await BookService.getList({ userId: ctx.state.user.id });
    }

    ctx.ok({
      books,
      folders
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/book/:bookId', compose([jwtAuth(), team()]), async ctx => {
  const id = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No id');

  try {
    const book = await BookService.getById({
      id: id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(book);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/deleted', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  try {
    const books = await BookService.getDeletedBooks({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    const folders = await BookFolderService.getDeleted({
      teamId: ctx.state.team?.id
    });

    ctx.ok({
      books,
      folders
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/mention/:memberId/:bookId', compose([jwtAuth(), team()]), async ctx => {
  const memberId = parseInt(ctx.params.memberId);
  const bookId = parseInt(ctx.params.bookId);

  const body = ctx.request.body;

  const projectId = ctx.query.projectId;
  const commentId = ctx.query.commentId;
  const chatId = ctx.query.chatId;
  const taskId = ctx.query.taskId;

  ctx.test(bookId, 400, 'No bookId');
  ctx.test(memberId, 400, 'No memberId');

  try {
    await BookService.mentionMember({
      userId: ctx.state.user.id,
      teamId: ctx.state.team.id,
      bookId,
      memberId,
      projectId,
      commentId,
      chatId,
      taskId,
      message: body.message
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
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

    await PlanService.checkBooks(ctx.state.user.id, ctx.state.team?.id);

    const book = await BookService.createWithTransaction(data);
    ctx.ok(book);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/link/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(bookId, 400, 'No book id');

  try {
    const data = await createLinkSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;

    const link = await BookService.createLink(data);
    ctx.ok(link.get());
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

// used by personal accounts only
router.post('/section', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await createSectionSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.subTitle = 'Section';
    data.isSection = true;

    const book = await BookService.createWithTransaction(data);
    ctx.ok(book);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/duplicate/:id', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const id = parseInt(ctx.params.id);

  try {
    const book = await DuplicationService.duplicateBook({
      id: id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(book);
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get(
  '/chats',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  ChatController.getBooksChats
);

router.put('/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const id = parseInt(ctx.params.bookId);

  try {
    const data = await updateSchema.validateAsync(
      {
        ...body,
        id: id
      },
      {
        stripUnknown: true
      }
    );

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await BookService.update(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await deleteSchema.validateAsync(
      {
        id: parseInt(ctx.params.bookId),
        permanent: body.permanent
      }
    );

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await BookService.deleteInTransaction(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/link/:id/:bookId', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const bookId = parseInt(ctx.params.bookId);
  const id = parseInt(ctx.params.id);

  ctx.test(bookId, 400, 'No book id');
  ctx.test(id, 400, 'No id');

  try {
    await BookService.deleteLink({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      bookId,
      id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/section/:bookId', compose([jwtAuth(), team()]), async ctx => {
  try {
    const data = await deleteSchema.validateAsync(
      {
        id: parseInt(ctx.params.bookId),
        permanent: true
      }
    );

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    await BookService.deleteInTransaction(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/restore/:bookId', compose([jwtAuth(), team({ role: ['admin'] })]), async ctx => {
  const id = parseInt(ctx.params.bookId);

  ctx.test(id, 400, 'No id');

  try {
    await BookService.restore({
      id: id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/order', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;

  try {
    const data = await orderSchema.validateAsync(body, {
      stripUnknown: true
    });
    data.userId = ctx.state.user.id;

    await BookService.order(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/folders', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const teamId = ctx.state.team?.id;
  const userId = ctx.state.user.id;

  ctx.ok(teamId, 400, 'No team id');

  try {
    const data = await createFolderSchema.validateAsync(body, {
      stripUnknown: true
    });
    const bookFolder = await BookFolderService.create({
      ...data,
      teamId,
      userId
    });

    ctx.ok({
      bookFolder
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.patch('/folders/:folderId', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const teamId = ctx.state.team?.id;
  const folderId = parseInt(ctx.params.folderId);

  ctx.ok(teamId, 400, 'No team id');

  try {
    const data = await updateFolderSchema.validateAsync(body, {
      stripUnknown: true
    });

    const bookFolder = await BookFolderService.update({
      teamId,
      folderId,
      updateData: data
    });

    ctx.ok({
      bookFolder
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/folders/:folderId', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const teamId = ctx.state.team?.id;
  const folderId = parseInt(ctx.params.folderId);

  ctx.ok(teamId, 400, 'No team id');

  try {
    const data = await deleteFolderSchema.validateAsync(body, {
      stripUnknown: true
    });
    await BookFolderService.delete({
      folderId,
      permanent: data?.permanent
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/folders/:folderId/restore', compose([jwtAuth(), team()]), async ctx => {
  const teamId = ctx.state.team?.id;
  const folderId = parseInt(ctx.params.folderId);

  ctx.ok(teamId, 400, 'No team id');

  try {
    const restoredBookFolder = await BookFolderService.restore({
      teamId,
      folderId
    });

    ctx.ok({
      folder: restoredBookFolder
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/:bookId/projects', compose([jwtAuth(), team()]), async (ctx) => {
  const teamId = ctx.state.team?.id;
  const userId = ctx.state.user.id;
  const bookId = parseInt(ctx.params.bookId);

  try {
    const projects = await ProjectService.getBookProjects({
      bookId,
      userId: teamId ? null : userId
    });

    ctx.ok({
      projects
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get(
  '/:bookId/activities',
  compose([
    jwtAuth(),
    team({ required: true }),
    pagination()
  ]),
  ActivityController.getBookActivities
);

router.get(
  '/:bookId/members',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  MemberController.getByBook
);

module.exports = router;
