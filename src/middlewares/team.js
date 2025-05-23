'use strict';

const { TeamService } = require('../services');
const config = require('../config');
const SubscriptionRepo = require('../repos/SubscriptionRepo');
const errors = require('../errors');

const team = async ({
  role,
  required = false,
  allowClient = true,
  allowForFree = true,
  hasFullAccess = true,
  checkSubscription = true
} = {}, ctx, next) => {
  const teamId = parseInt(ctx.get(config.team.header));
  const bookId = ctx.params.bookId || ctx.query.bookId;

  if (!teamId && !required) {
    return next();
  }

  if (!teamId && required) {
    ctx.bad(403, 'Team not found');

    return;
  }

  let team;
  let member;
  const user = ctx.state.user;

  try {
    if (!user) throw new Error('User not found');
    // TODO: check if trial plan is not expired

    team = await TeamService.getTeamById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    if (!user.isClient) {
      member = await TeamService.getTeamMember({
        userId: user.id,
        teamId: teamId
      });

      if (!member) {
        throw new Error('Member not found');
      }
    }

    if (bookId) {
      await TeamService.getAccessForBook({
        userId: user.id,
        teamId: team.id,
        bookId: bookId,
        onlyEdit: user.isClient && !hasFullAccess
      });
    }
  } catch (err) {
    ctx.bad(400, err);
  }

  if (user.isClient && !allowClient) {
    ctx.bad(403, 'Not permitted');
  }

  if (role) {
    if (!role.includes(member.role)) {
      ctx.bad(403, 'Not permitted');
    }
  }

  if (checkSubscription && teamId) {
    const subscription = await SubscriptionRepo.getActiveSubscription({
      teamId
    });

    const isFreePlan = await SubscriptionRepo.checkIsFreePlan(teamId);

    if (!allowForFree && isFreePlan) {
      ctx.bad(403, 'Not permitted');
    }

    if (subscription?.expireAt && new Date() > subscription.expireAt) {
      ctx.bad(403, 'Subscription expired', { code: errors.SUBSCRIPTION_EXPIRED });
    }
  }

  ctx.state.team = team;
  ctx.state.member = member;

  return next();
};

/**
 * @param args {{
 *   role: string[],
 *   hasFullAccess: boolean,
 *   required: boolean,
 *   allowClient: boolean,
 *   allowForFree: boolean,
 *   checkSubscription: boolean
 * }}
 * @return {any}
 */
module.exports = (args = {}) => team.bind(null, args);
