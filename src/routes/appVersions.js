'use strict';

const Router = require('koa-router');
const { AppVersionService } = require('../services');

const router = new Router({
  prefix: '/versions'
});

router.get('/', async ctx => {
  try {
    const versions = await AppVersionService.getVersion();

    ctx.ok(versions);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

module.exports = router;
