const { catchError } = require('./common/hof');
const AnnotationService = require('../services/AnnotationService');
const {
  createAnnotationBodyValidator,
  createAnnotationParamsValidator,
  updateAnnotationBodyValidator,
  updateAnnotationParamsValidator
} = require('../validators/annotationValidators');

async function create (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const teamId = parseInt(ctx.state.team.id);
  const { attachmentId, chatId } = await createAnnotationParamsValidator.validateAsync(ctx.params);
  const data = await createAnnotationBodyValidator.validateAsync(ctx.request.body);

  const messages = await AnnotationService.createWithMessage({
    attachmentId,
    chatId,
    userId,
    teamId,
    createData: data
  });

  ctx.ok({
    messages
  });
}

async function update (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const { annotationId } = await updateAnnotationParamsValidator.validateAsync(ctx.params);
  const data = await updateAnnotationBodyValidator.validateAsync(ctx.request.body);

  await AnnotationService.updateAnnotation({
    annotationId,
    userId,
    updateData: data
  });

  ctx.ok();
}

module.exports = {
  create: catchError(create),
  update: catchError(update)
};
