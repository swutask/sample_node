const joi = require('@hapi/joi');

const resolveParamsValidator = joi.object({
  messageId: joi.number().required()
});

module.exports = {
  resolveParamsValidator
};
