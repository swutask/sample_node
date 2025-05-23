const joi = require('@hapi/joi');

const updateInboxActivityValidator = joi.object({
  status: joi.string().valid('read', 'unread').required(),
  inboxActivityIds: joi.array().items(joi.number()).required()
});

const getInboxActivitiesValidator = joi.object({
  type: joi.string().valid('public', 'private')
});

const deleteMannyQueryValidator = joi.object({
  type: joi.string().valid('public', 'private')
});

module.exports = {
  updateInboxActivityValidator,
  getInboxActivitiesValidator,
  deleteMannyQueryValidator
};
