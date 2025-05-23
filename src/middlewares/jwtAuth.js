'use strict';

const { UserService } = require('../services');
const config = require('../config');

const jwtAuth = async (role, ctx, next) => {
  let user;
  const token = ctx.get(config.auth.header);

  try {
    user = await UserService.getUserByToken(token);
  } catch (err) {
    ctx.bad(401, 'Not authenticated');
  }

  if (role) {
    if (user.role.name !== role) {
      ctx.bad(403, 'Not permitted');
    }
  }

  ctx.state.user = user;

  return next();
};

module.exports = (role) => jwtAuth.bind(null, role);
