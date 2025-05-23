const { catchError } = require('./common/hof');
const ActivityService = require('../services/ActivityService');
const {
  updateInboxActivityValidator, getInboxActivitiesValidator,
  deleteMannyQueryValidator
} = require('../validators/activityValidators');

async function getInboxActivities (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const limit = ctx.pagination.limit;

  const data = await getInboxActivitiesValidator.validateAsync(ctx.query, {
    stripUnknown: true
  });

  const inboxActivities = await ActivityService.getInboxActivities({
    userId,
    limit,
    type: data.type
  });

  ctx.ok({
    inboxActivities
  });
}

async function updateInboxActivities (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const data = await updateInboxActivityValidator.validateAsync(ctx.request.body, {
    stripUnknown: true
  });

  const updatedCount = await ActivityService.updateInboxActivities({
    userId,
    status: data.status,
    inboxActivityIds: data.inboxActivityIds
  });

  ctx.ok({
    updatedCount
  });
}

async function deleteInboxActivity (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const inboxActivityId = parseInt(ctx.params.inboxActivityId);

  ctx.test(inboxActivityId, 400, 'No inbox activity id');

  await ActivityService.deleteInboxActivity({
    userId,
    inboxActivityId
  });

  ctx.ok();
}

async function deleteMannyInboxActivities (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const { type } = await deleteMannyQueryValidator.validateAsync(ctx.query);

  await ActivityService.deleteMannyInboxActivities({
    userId,
    type
  });

  ctx.ok();
}

async function getBookActivities (ctx) {
  const bookId = parseInt(ctx.params.bookId);
  const limit = ctx.pagination.limit;

  ctx.test(bookId, 400, 'No book id');

  const bookActivities = await ActivityService.getBookActivities({
    bookId,
    limit
  });

  ctx.ok({
    bookActivities
  });
}

async function getTaskActivities (ctx) {
  const taskId = parseInt(ctx.params.taskId);
  const userId = parseInt(ctx.state.user.id);
  const teamId = ctx.state.team.id;
  const limit = ctx.pagination.limit;

  ctx.test(taskId, 400, 'No task id');

  const taskActivities = await ActivityService.getTaskActivities({
    taskId,
    userId,
    teamId,
    limit
  });

  ctx.ok({
    taskActivities
  });
}

module.exports = {
  getInboxActivities: catchError(getInboxActivities),
  deleteInboxActivity: catchError(deleteInboxActivity),
  deleteMannyInboxActivities: catchError(deleteMannyInboxActivities),
  getBookActivities: catchError(getBookActivities),
  getTaskActivities: catchError(getTaskActivities),
  updateInboxActivities: catchError(updateInboxActivities)
};
