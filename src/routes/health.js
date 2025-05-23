'use strict';

const Router = require('koa-router');
const { sequelize } = require('../loaders');
const router = new Router({
  prefix: '/health'
});

router.get('/', async ctx => {
  const isDb = await sequelize.check();
  ctx.test(isDb, 500, 'Database connection problem');
  ctx.status = 200;
  ctx.body = 'OK';
});

module.exports = router;
