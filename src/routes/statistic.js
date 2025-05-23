'use strict';

const Router = require('koa-router');
const { StatisticService } = require('../services');
const { jwtAuth, pagination } = require('../middlewares');
const compose = require('koa-compose');

const router = new Router({
  prefix: '/statistic'
});

router.get('/', compose([jwtAuth('admin'), pagination()]), async ctx => {
  try {
    const statistic = await StatisticService.getSignedUpStatistic({
      orderDirection: ctx.query.orderDirection,
      orderColumn: ctx.query.orderColumn,
      limit: ctx.pagination.limit,
      page: ctx.pagination.page
    });

    ctx.ok(statistic);
  } catch (err) {
    ctx.bad(400, err);
  }
});

module.exports = router;
