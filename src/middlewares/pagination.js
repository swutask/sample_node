'use strict';

const pagination = async (ctx, next) => {
  const limit = parseInt(ctx.query.limit) || 1;
  const page = parseInt(ctx.query.page) || 0;
  const offset = limit * page;
  ctx.pagination = {
    limit,
    page,
    offset
  };

  return next();
};

module.exports = _ => pagination;
