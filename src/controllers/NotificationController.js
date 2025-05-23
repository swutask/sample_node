const { NotificationService } = require('../services');
const { catchError } = require('./common/hof');

async function deleteManny (ctx) {
  const userId = ctx.state.user.id;
  const teamId = ctx.state.team.id;

  await NotificationService.deleteManny({
    userId,
    teamId
  });

  ctx.ok();
}

module.exports = {
  deleteManny: catchError(deleteManny)
};
