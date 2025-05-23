const { catchError } = require('./common/hof');
const SearchService = require('../services/SearchService');
const { searchSchema, searchQuerySchema } = require('../validators/searchValidator');

async function globalSearch (ctx) {
  const { modelNames, query } = await searchSchema.validateAsync(ctx.query);
  const result = await SearchService.search({
    userId: ctx.state.user.id,
    teamId: ctx.state.team?.id,
    searchValue: query,
    modelNames: modelNames?.split(',')
  });

  ctx.ok({ result });
}

async function mentionSearch (ctx) {
  const bookId = parseInt(ctx.params.bookId);

  ctx.test(bookId, 400, 'No bookId');

  const { query } = await searchQuerySchema.validateAsync(ctx.query);
  const result = await SearchService.searchMentions({
    userId: ctx.state.user.id,
    teamId: ctx.state.team?.id,
    bookId,
    searchValue: query
  });

  ctx.ok({ result });
}
async function chatSearch (ctx) {
  const chatId = parseInt(ctx.params.chatId);

  ctx.test(chatId, 400, 'Chat Id is required');

  const { query } = await searchQuerySchema.validateAsync(ctx.query);
  const result = await SearchService.searchMessages({
    userId: ctx.state.user.id,
    teamId: ctx.state.team?.id,
    chatId,
    searchValue: query
  });

  ctx.ok({ result });
}

module.exports = {
  globalSearch: catchError(globalSearch),
  mentionSearch: catchError(mentionSearch),
  chatSearch: catchError(chatSearch)
};
