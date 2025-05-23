const { catchError } = require('./common/hof');
const {
  updateAttachmentParamsValidator,
  updateAttachmentBodyValidator,
  updateAttachmentQueryValidator,
  updateAttachmentsOrderBodyValidator,
  updateSharedAttachmentParamsValidator,
  createVersionBodyValidator
} = require('../validators/attachmentValidators');
const {
  AttachmentService,
  PlanService
} = require('../services');

async function update (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const teamId = parseInt(ctx.state.team.id);

  const { attachmentId } = await updateAttachmentParamsValidator.validateAsync(ctx.params);
  const { keyForGettingExternalVersionId } = await updateAttachmentQueryValidator.validateAsync(ctx.query);
  const data = await updateAttachmentBodyValidator.validateAsync(ctx.request.body);

  await AttachmentService.update({
    attachmentId,
    teamId,
    userId,
    keyForGettingExternalVersionId,
    updateData: data
  });

  ctx.ok();
}

async function updateProjectShared (ctx) {
  const {
    projectId,
    attachmentId,
    shareId
  } = await updateSharedAttachmentParamsValidator.validateAsync(ctx.params);
  const data = await updateAttachmentBodyValidator.validateAsync(ctx.request.body);
  const { keyForGettingExternalVersionId } = await updateAttachmentQueryValidator.validateAsync(ctx.params);

  await AttachmentService.updateProjectShared({
    attachmentId,
    projectId,
    shareId,
    keyForGettingExternalVersionId,
    updateData: data
  });

  ctx.ok();
}

async function updateOrders (ctx) {
  const { attachmentIds } = await updateAttachmentsOrderBodyValidator.validateAsync(ctx.request.body);

  await AttachmentService.updateOrders({
    attachmentIds
  });

  ctx.ok();
}

async function createVersion (ctx) {
  const userId = parseInt(ctx.state.user.id);
  const teamId = parseInt(ctx.state.team.id);

  const {
    name,
    originalId,
    size
  } = await createVersionBodyValidator.validateAsync(ctx.request.body);

  await PlanService.checkSize({
    teamId: teamId,
    newSize: size
  });

  const attachment = await AttachmentService.addVersion({
    name,
    originalId,
    size,
    userId
  });

  ctx.ok({
    attachment
  });
}

module.exports = {
  update: catchError(update),
  updateProjectShared: catchError(updateProjectShared),
  updateOrders: catchError(updateOrders),
  createVersion: catchError(createVersion)
};
