const { catchError } = require('./common/hof');
const { TaskService } = require('../services/index');
const {
  getByBookIdsValidator,
  revertMoveToBookParamsValidator,
  getTaskSchema
} = require('../validators/taskValidators');

async function getTaskById (ctx) {
  const { taskId } = await getTaskSchema.validateAsync(ctx.params);
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team.id;

  const task = await TaskService.getById({ taskId, teamId, userId });

  ctx.ok({ task });
}

async function getAllCalendarTasks (ctx) {
  const userId = ctx.state.user.id;
  const tasks = await TaskService.getCalendarTasks({ userId });

  ctx.ok({ tasks });
}

async function getAllByBookIds (ctx) {
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team?.id;

  const {
    ids,
    tagIds,
    teamMemberIds,
    startDate,
    endDate,
    urgencyStatuses,
    search,
    bookIds,
    completedAtFrom,
    completedAtTo,
    withoutCompleted,
    titleOrder,
    updatedAtOrder,
    createdAtOrder,
    endDateOrder,
    urgentStatusOrder,
    storyPointsOrder,
    firstNameOrderTeamMember,
    nameOrderTag
  } = await getByBookIdsValidator.validateAsync(ctx.query, {
    stripUnknown: true
  });

  if (teamMemberIds) {
    ctx.test(teamId, 400, 'Team not found');
  }

  const tasks = await TaskService.getByBookId({
    ids: ids?.split(',').map(id => parseInt(id)),
    startDate,
    endDate,
    search,
    urgencyStatuses: urgencyStatuses?.split(',').map(status => parseInt(status)),
    tagIds: tagIds?.split(',').map(id => parseInt(id)),
    teamMemberIds: teamMemberIds?.split(',').map(id => parseInt(id)),
    bookIds: bookIds?.split(',').map(id => parseInt(id)),
    userId,
    teamId,
    completedAtFrom,
    completedAtTo,
    withoutCompleted,
    orders: {
      titleOrder,
      updatedAtOrder,
      createdAtOrder,
      endDateOrder,
      urgentStatusOrder,
      storyPointsOrder,
      firstNameOrderTeamMember,
      nameOrderTag
    }
  });

  ctx.ok({ tasks });
}

async function unsubscribe (ctx) {
  const taskId = parseInt(ctx.params.taskId);
  const userId = parseInt(ctx.state.user.id);
  const teamId = ctx.state.team.id;

  ctx.test(taskId, 400, 'No task id');

  await TaskService.unsubscribe({ userId, taskId, teamId });

  ctx.ok();
}

async function subscribe (ctx) {
  const taskId = parseInt(ctx.params.taskId);
  const userId = parseInt(ctx.state.user.id);
  const teamId = ctx.state.team.id;

  ctx.test(taskId, 400, 'No task id');

  await TaskService.subscribe({ userId, taskId, teamId });

  ctx.ok();
}

async function revertMoveToBook (ctx) {
  const { taskId } = await revertMoveToBookParamsValidator.validateAsync(ctx.params);

  await TaskService.revertMoveToBook({
    taskId
  });

  ctx.ok();
}

module.exports = {
  getAllByBookIds: catchError(getAllByBookIds),
  unsubscribe: catchError(unsubscribe),
  subscribe: catchError(subscribe),
  revertMoveToBook: catchError(revertMoveToBook),
  getTaskById: catchError(getTaskById),
  getAllCalendarTasks: catchError(getAllCalendarTasks)
};
