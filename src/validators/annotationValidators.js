const joi = require('@hapi/joi');

const createAnnotationBodyValidator = joi.object({
  text: joi.string().required(),
  x: joi.number().required(),
  y: joi.number().required()
});

const updateAnnotationBodyValidator = joi.object({
  text: joi.string(),
  x: joi.number(),
  y: joi.number(),
  resolvedAt: joi.date()
});

const updateAnnotationParamsValidator = joi.object({
  annotationId: joi.number().required()
});

const createAnnotationParamsValidator = joi.object({
  attachmentId: joi.number().required(),
  chatId: joi.number().required()
});

module.exports = {
  createAnnotationBodyValidator,
  createAnnotationParamsValidator,
  updateAnnotationBodyValidator,
  updateAnnotationParamsValidator
};
