const { catchError } = require('./common/hof');
const { ChatService } = require('../services');

async function getBookChats (ctx) {
  const teamId = ctx.state.team.id;
  const userId = ctx.state.user.id;

  const chats = await ChatService.getBookChats({
    teamId,
    userId
  });

  ctx.ok({
    chats
  });
}

module.exports = {
  getBooksChats: catchError(getBookChats)
};
