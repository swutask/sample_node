const { catchError } = require('./common/hof');
const CollaborationServiceV2 = require('../services/CollaborationServiceV2');

async function getJWTForProject (ctx) {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team?.id;
  const shareId = ctx.query.shareId;

  ctx.test(id, 400, 'Wrong task id');
  ctx.test(bookId, 400, 'Wrong book id');

  const result = await CollaborationServiceV2.getJWTForProject({ id, bookId, userId, teamId, shareId });

  ctx.ok(result);
}

async function getJWTForSharedProject (ctx) {
  const id = parseInt(ctx.params.id);
  const shareId = ctx.params.shareId;

  ctx.test(id, 400, 'Wrong task id');

  const result = await CollaborationServiceV2.getJWTForProject({ id, shareId });

  ctx.ok(result);
}

async function getJWTForTask (ctx) {
  const id = parseInt(ctx.params.id);
  const bookId = parseInt(ctx.params.bookId);
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team?.id;

  ctx.test(id, 400, 'Wrong task id');
  ctx.test(bookId, 400, 'Wrong book id');

  const result = await CollaborationServiceV2.getJWTForTask(id, bookId, userId, teamId);

  ctx.ok(result);
}

async function taskWebhook (ctx) {
  const body = ctx.request.body;

  await CollaborationServiceV2.parseWebhook(body);

  ctx.ok();
}

module.exports = {
  getJWTForSharedProject: catchError(getJWTForSharedProject),
  getJWTForProject: catchError(getJWTForProject),
  getJWTForTask: catchError(getJWTForTask),
  taskWebhook: catchError(taskWebhook)
};
