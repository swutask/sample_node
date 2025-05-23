const { catchError } = require('./common/hof');
const { getByBookParamsValidator } = require('../validators/memberValidator');
const BookService = require('../services/BookService');

async function getByBook (ctx) {
  const { bookId } = await getByBookParamsValidator.validateAsync(ctx.params);

  const members = await BookService.getMembers({
    bookId
  });

  ctx.ok({
    members
  });
}

module.exports = {
  getByBook: catchError(getByBook)
};
