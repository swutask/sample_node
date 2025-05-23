const joi = require('@hapi/joi');

const updateAttachmentParamsValidator = joi.object({
  attachmentId: joi.number().required()
});

const updateAttachmentBodyValidator = joi.object({
  url: joi.string().allow(null),
  name: joi.string(),
  order: joi.number(),
  taskId: joi.number(),
  messageId: joi.number(),
  status: joi.number().allow(null)
});

const updateAttachmentQueryValidator = joi.object({
  keyForGettingExternalVersionId: joi.string()
});

const updateSharedAttachmentParamsValidator = joi.object({
  projectId: joi.number().required(),
  attachmentId: joi.number().required(),
  shareId: joi.number().required()
});

const updateAttachmentsOrderBodyValidator = joi.object({
  attachmentIds: joi.array().items(joi.number()).min(1).required()
});

const createVersionBodyValidator = joi.object({
  name: joi.string().required(),
  originalId: joi.number().required(),
  size: joi.number().required()
});

module.exports = {
  updateAttachmentParamsValidator,
  updateAttachmentBodyValidator,
  updateAttachmentQueryValidator,
  updateAttachmentsOrderBodyValidator,
  updateSharedAttachmentParamsValidator,
  createVersionBodyValidator
};
