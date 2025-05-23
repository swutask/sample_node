const joi = require('@hapi/joi');

const getByBookParamsValidator = joi.object({
  bookId: joi.number().required()
});

module.exports = {
  getByBookParamsValidator
};
