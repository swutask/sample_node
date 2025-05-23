const { catchError } = require('./common/hof');
const SubscriptionService = require('../services/SubscriptionService');

async function extendTrial (ctx) {
  const teamId = ctx.state.team.id;

  await SubscriptionService.extendTrial({ teamId });

  ctx.ok();
}

module.exports = {
  extendTrial: catchError(extendTrial)
};
