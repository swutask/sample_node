'use strict';

const logger = require('koa-logger');
const log = require('../log')('access');

module.exports = () => {
  return logger((_, args) => {
    const value = args.slice(1).join(' ');

    if (!value.includes('api/health')) log.info(value);
  });
};
