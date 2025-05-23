'use strict';

const Router = require('koa-router');
const compose = require('koa-compose');
const { jwtAuth, team } = require('../middlewares');
const SearchController = require('../controllers/SearchController');

const router = new Router({
  prefix: '/search'
});

router.get('/',
  compose([jwtAuth(), team()]),
  SearchController.globalSearch
);

router.get('/mentions/book/:bookId',
  compose([jwtAuth(), team()]),
  SearchController.mentionSearch);

router.get('/chat/:chatId',
  compose([jwtAuth(), team()]),
  SearchController.chatSearch);

module.exports = router;
