const joi = require('@hapi/joi');
const { rules } = require('./common');

const searchSchema = joi.object({
  query: joi.string().required(),
  modelNames: rules.stringList([
    'project',
    'book',
    'task',
    'message',
    'member',
    'attachment'
  ])
});

const searchQuerySchema = joi.object({
  query: joi.string().required().allow('')
});

module.exports = {
  searchQuerySchema,
  searchSchema
};
