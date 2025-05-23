'use strict';

const Router = require('koa-router');
const StatService = require('../services/StatService');
const { jwtAuth, team } = require('../middlewares');
const compose = require('koa-compose');
const router = new Router({
  prefix: '/stats'
});

router.get('/',
  compose([
    jwtAuth(),
    team({ checkSubscription: false })
  ]),
  async ctx => {
    try {
      const stats = await StatService.getStats({
        teamId: ctx.state.team?.id
      });

      ctx.ok(stats);
    } catch (err) {
      ctx.bad(400, err);
    }
  }
);

module.exports = router;
