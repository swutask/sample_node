const { catchError } = require('./common/hof');
const { resolveParamsValidator } = require('../validators/messageValidators');
const MessageService = require('../services/MessageService');
const { ChatService } = require('../services');

async function resolve (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const { messageId } = await resolveParamsValidator.validateAsync(ctx.params);

  await MessageService.updateResolve({
    messageId,
    userId,
    resolvedAt: new Date()
  });

  ctx.ok();
}

async function unresolve (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const { messageId } = await resolveParamsValidator.validateAsync(ctx.params);

  await MessageService.updateResolve({
    messageId,
    userId,
    resolvedAt: null
  });

  ctx.ok();
}

async function getUnreadCount (ctx) {
  const teamId = ctx.state.team.id;
  const userId = ctx.state.user.id;

  const unreadCount = await ChatService.getUnreadCount({
    teamId,
    userId
  });

  ctx.ok({
    unreadCount
  });
}

module.exports = {
  resolve: catchError(resolve),
  unresolve: catchError(unresolve),
  getUnreadCount: catchError(getUnreadCount)
};
