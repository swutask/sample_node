'use strict';

const Router = require('koa-router');
const compose = require('koa-compose');
const { jwtAuth, team } = require('../middlewares');
const { ReactionsService } = require('../services');

const router = new Router({
  prefix: '/reactions'
});

router.get('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    const reactions = await ReactionsService.getReactions();

    ctx.ok({ reactions });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
