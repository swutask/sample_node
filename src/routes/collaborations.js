'use strict';

const Router = require('koa-router');

const { jwtAuth, team } = require('../middlewares');
const compose = require('koa-compose');
const CollaborationController = require('../controllers/CollaborationController');

const router = new Router({
  prefix: '/collaborations'
});

router.get('/book/:bookId/project/:id',
  compose([
    jwtAuth(),
    team()
  ]),
  CollaborationController.getJWTForProject
);

router.get('/share/:shareId/project/:id',
  CollaborationController.getJWTForSharedProject
);

router.get('/book/:bookId/task/:id',
  compose([
    jwtAuth(),
    team()
  ]),
  CollaborationController.getJWTForTask
);

router.post('/task/webhook',
  CollaborationController.taskWebhook
);

module.exports = router;
