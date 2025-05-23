'use strict';

const Router = require('koa-router');
const multer = require('@koa/multer');
const { jwtAuth, team, pagination } = require('../middlewares');
const { getNanoSec } = require('../utils');
const path = require('path');
const compose = require('koa-compose');
const { AttachmentService, PlanService } = require('../services');
const ProjectService = require('../services/ProjectService');
const joi = require('@hapi/joi');
const request = require('request');
const AttachmentController = require('../controllers/AttachmentController');
const AnnotationController = require('../controllers/AnnotationController');
const ProjectRepo = require('../repos/ProjectRepo');

const router = new Router({
  prefix: '/attachments'
});

const schema = joi.object({
  ids: joi.array().required()
});

const idSchema = joi.object({
  id: joi.number().required()
});

const createFileSchema = joi.object({
  mimeType: joi.string().required(),
  size: joi.number().min(1).max(400 * 1024 * 1024).required(),
  name: joi.string().required(),
  originalname: joi.string().allow(null),
  order: joi.number()
});

const createFilesSchema = joi.object({
  files: joi.array().items(createFileSchema).required()
});

const nameSchema = joi.object({
  name: joi.string().required()
});

const updateSchema = joi.object({
  url: joi.string().required().allow(null),
  keyForGettingExternalVersionId: joi.string().allow(null)
});

const bookIdsSchema = joi.object({
  bookIds: joi.array().items(joi.number()).required()
});

const deleteManyFilesQuerySchema = joi.object({
  ids: joi.string().regex(/^\d+(,\d+)*$/).required(),
  permanent: joi.boolean()
});

const _upload = async (ctx) => {
  const files = ctx.files;
  const bookId = ctx.query.bookId;
  const projectId = ctx.query.projectId;
  const taskId = ctx.query.taskId;
  const isTaskThumbnail = ctx.query.isTaskThumbnail;
  const showInCard = ctx.query.showInCard;
  const showInModal = ctx.query.showInModal;

  ctx.test(files.length === 1, 400, 'Only 1 file acceptable');

  const file = files[0];
  const name = Date.now() +
    '_' +
    getNanoSec() +
    path.extname(file.originalname);
  const size = file.size;
  const mimeType = file.mimetype;

  try {
    await PlanService.checkSize({
      teamId: ctx.state.team?.id,
      newSize: size
    });

    const data = await AttachmentService.createImage({
      size: size,
      mimeType: mimeType,
      body: file.buffer,
      name: name,
      originalname: file.originalname,
      projectId: projectId,
      taskId: taskId,
      bookId: bookId,
      isTaskThumbnail,
      showInCard,
      showInModal,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(data);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
};

router.get('/file/:id', compose([jwtAuth(), team()]), async ctx => {
  const id = parseInt(ctx.params.id);

  ctx.test(id, 400, 'No id');

  try {
    const data = await AttachmentService.getFile({
      id: id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(data);
  } catch (err) {
    console.log(err);
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/file/:id/:projectId/:shareId', async ctx => {
  const id = parseInt(ctx.params.id);
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;

  ctx.test(id, 400, 'No id');
  ctx.test(projectId, 400, 'No projectId');
  ctx.test(shareId, 400, 'No shareId');

  try {
    const data = await AttachmentService.getShareFile({
      id: id,
      shareId: shareId,
      projectId: projectId
    });

    ctx.ok(data);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/file', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const bookId = ctx.query.bookId;
  const projectId = ctx.query.projectId;
  const taskId = ctx.query.taskId;

  try {
    const data = await createFilesSchema.validateAsync(body, {
      stripUnknown: true
    });

    const relatedIds = {
      projectId,
      taskId,
      bookId
    };

    const globalSize = data.files.reduce((accumulator, fileData) => {
      return accumulator + fileData.size;
    }, 0);

    await PlanService.checkSize({
      teamId: ctx.state.team?.id,
      newSize: globalSize
    });

    const filesData = await AttachmentService.createManyFiles(
      {
        userId: ctx.state.user.id,
        teamId: ctx.state.team?.id
      },
      relatedIds,
      data.files
    );

    ctx.ok({ files: filesData });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/file/share/:projectId/:shareId', async ctx => {
  const projectId = parseInt(ctx.params.projectId);
  const bookId = ctx.query.bookId;
  const shareId = ctx.params.shareId;
  const body = ctx.request.body;

  ctx.test(projectId, 400, 'No page id');
  ctx.test(bookId, 400, 'No book id');
  ctx.test(shareId, 400, 'No share id');

  try {
    const data = await createFilesSchema.validateAsync(body, {
      stripUnknown: true
    });

    const { userId, teamId } = await ProjectRepo.getUserIdFromSharedProject(projectId, shareId);

    const file = await AttachmentService.createManyFiles(
      {
        userId,
        teamId,
        bookId
      },
      data.files
    );

    ctx.ok(file);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/file/:id', compose([jwtAuth(), team()]), async ctx => {
  const projectId = ctx.query.projectId;
  const taskId = ctx.query.taskId;
  const id = parseInt(ctx.params.id);
  const bookId = ctx.query.bookId;
  const body = ctx.request.body;

  ctx.test(id, 400, 'No id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.taskId = taskId;
    data.projectId = projectId;
    data.bookId = bookId;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;

    const attachment = await AttachmentService.updateFile(data);

    ctx.ok({ attachment });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/file/share/:id/:projectId/:shareId', async ctx => {
  const bookId = ctx.query.bookId;
  const projectId = parseInt(ctx.params.projectId);
  const shareId = ctx.params.shareId;
  const id = parseInt(ctx.params.id);
  const body = ctx.request.body;

  ctx.test(projectId, 400, 'No page id');
  ctx.test(id, 400, 'No id');

  try {
    const data = await updateSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.projectId = projectId;
    data.shareId = shareId;
    data.bookId = bookId;
    data.id = id;

    await AttachmentService.updateShareFile(data);

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/upload',
  compose([
    jwtAuth(),
    team(),
    async (ctx, next) => {
      const projectId = ctx.query.projectId;

      if (!ctx.state.team && projectId) {
        const isUserProject = await ProjectService.isUserProject(projectId, ctx.state.user.id);
        ctx.test(isUserProject, 400, 'Not user page');
      }

      return next();
    },
    multer({
      storage: multer.memoryStorage()
    }).any()
  ]),
  async ctx => {
    return _upload(ctx);
  });

router.post('/share/:projectId/:shareId',
  compose([
    async (ctx, next) => {
      const projectId = parseInt(ctx.params.projectId);
      const shareId = ctx.params.shareId;

      ctx.test(projectId, 400, 'No page id');
      ctx.test(shareId, 400, 'No share id');

      try {
        const { userId } = await ProjectRepo.getUserIdFromSharedProject(projectId, shareId);
        ctx.state.user = { id: userId };

        return next();
      } catch (err) {
        ctx.bad(400, err, { code: err.code ?? 0 });
      }
    },
    multer({
      storage: multer.memoryStorage()
    }).any()]),
  async ctx => {
    return _upload(ctx);
  });

router.post('/delete-restore', compose([jwtAuth(), team()]), async ctx => {
  const projectId = ctx.query.projectId;
  const taskId = ctx.query.taskId;
  const body = ctx.request.body;

  try {
    const { ids } = await schema.validateAsync(body, {
      stripUnknown: true
    });

    await AttachmentService.deleteOrRestore({
      attachmentIds: ids,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      projectId: projectId,
      taskId: taskId
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/delete-task-thumbnail', compose([jwtAuth(), team()]), async ctx => {
  const taskId = ctx.query.taskId;
  const body = ctx.request.body;

  try {
    const { id } = await idSchema.validateAsync(body, {
      stripUnknown: true
    });

    await AttachmentService.deleteTaskThumbnail({
      id: id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      taskId: taskId
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/proxy', async ctx => {
  const url = ctx.query.url;

  if (!url) {
    ctx.bad(400, 'No url specified');
  } else if (typeof url !== 'string') {
    ctx.bad(400, `Invalid url specified: ${url}`);
  }

  if (ctx.query.responseType === 'blob') {
    ctx.body = ctx.req.pipe(request(url));
  } else {
    request({ url: url, encoding: 'binary' }, (error, response, body) => {
      if (error) {
        ctx.bad(400, error);
      }
      ctx.ok(`data:${response.headers['content-type']};base64,${
        Buffer.from(
          body,
          'binary'
        ).toString('base64')}`);
    });
  }
});

router.get('/files', compose([jwtAuth(), team(), pagination()]), async ctx => {
  const books = ctx.query.books;

  try {
    const bookIds = books.split(',');
    const data = await bookIdsSchema.validateAsync({ bookIds });

    const files = await AttachmentService.getAll({
      bookIds: data.bookIds,
      teamId: ctx.state.team?.id,
      userId: ctx.state.user.id,
      limit: ctx.pagination.limit,
      page: ctx.pagination.page,
      search: ctx.query.search
    });

    ctx.ok(files);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/update-name/:id', compose([jwtAuth(), team({ hasFullAccess: false })]), async ctx => {
  const body = ctx.request.body;
  const bookId = ctx.query.bookId;
  const id = parseInt(ctx.params.id);

  ctx.test(id, 400, 'No id');

  try {
    const { name } = await nameSchema.validateAsync(body, {
      stripUnknown: true
    });

    await AttachmentService.updateName({
      name,
      id: id,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id,
      bookId: bookId
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/files', compose([jwtAuth(), team()]), async ctx => {
  try {
    const { ids, permanent } = await deleteManyFilesQuerySchema.validateAsync(ctx.query, {
      stripUnknown: true
    });
    const fileIds = ids.split(',').map((id) => parseInt(id));
    const deletedFiles = await AttachmentService.deleteMany({
      fileIds,
      permanent
    });

    ctx.ok({
      files: deletedFiles
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post(
  '/versions',
  compose([
    jwtAuth(),
    team({
      required: true
    })
  ]),
  AttachmentController.createVersion
);

router.patch(
  '/:attachmentId',
  compose([
    jwtAuth(),
    team({
      required: true
    })
  ]),
  AttachmentController.update
);

router.put(
  '/orders',
  compose([
    jwtAuth(),
    team({
      required: true
    })
  ]),
  AttachmentController.updateOrders
);

router.post(
  '/:attachmentId/chats/:chatId/messages/annotations',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  AnnotationController.create
);

router.patch(
  '/annotations/:annotationId',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  AnnotationController.update
);

module.exports = router;
