'use strict';

const Router = require('koa-router');
const { UserService } = require('../../services');
const config = require('../../config');
const router = new Router({
  prefix: '/oauth'
});

router.use(async (ctx, next) => {
  await next();
  if (ctx.state.user) {
    const token = await UserService.createOauthTokenForUser(ctx.state.user);
    ctx.cookies.set(config.oauth.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 5 * 60 * 1000,
      path: config.apiPath,
      overwrite: true,
      domain: config.oauth.cookieDomain,
      sameSite: 'lax'
    });
  }
});

router.get('/', async ctx => {
  const token = ctx.cookies.get(config.oauth.cookieName);
  try {
    if (!token) throw new Error('No token');

    ctx.cookies.set(config.oauth.cookieName, null, {
      path: config.apiPath,
      domain: config.oauth.cookieDomain
    });
    const user = await UserService.getUserByOauthToken(token);
    const newToken = await UserService.createTokenForUser(user);
    ctx.ok({ token: newToken });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.use(require('./google').routes());
router.use(require('./facebook').routes());

module.exports = router;
