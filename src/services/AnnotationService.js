const ChatService = require('./ChatService');
const AnnotationRepo = require('../repos/AnnotationRepo');
const { CustomError } = require('../errors/CustomError');
const AttachmentRepo = require('../repos/AttachmentRepo');
const ActivityProducerService = require('./ActivityProducerService');

/**
 * @param attachmentId {number}
 * @param chatId {number}
 * @param userId {number}
 * @param teamId {number}
 * @param bookId {number}
 * @param createData {*}
 * @returns {Promise<*>}
 */
async function createWithMessage ({
  attachmentId,
  chatId,
  userId,
  teamId,
  createData
}) {
  const attachment = await AttachmentRepo.getByIdAndChatId(attachmentId, chatId);

  if (!attachment) {
    throw new CustomError('Attachment with chat not found', 404);
  }

  const createdAnnotation = await AnnotationRepo.create({
    ...createData,
    teamId,
    attachmentId
  });
  const message = await ChatService.addMessage({
    teamId,
    chatId,
    userId,
    bookId: attachment.book,
    text: '',
    notifyActivity: false,
    annotation: createdAnnotation
  });
  await AnnotationRepo.updateById(createdAnnotation.id, {
    messageId: message.id
  });

  await ActivityProducerService.sendMessage({
    from: null,
    to: {
      id: createdAnnotation.id
    },
    creatorId: userId,
    type: 'book',
    entity: 'annotation'
  });

  return message;
}

async function updateAnnotation ({
  userId,
  annotationId,
  updateData
}) {
  const annotation = await AnnotationRepo.getByIdAndMessageUserId(annotationId, userId);

  if (!annotation) {
    throw new CustomError('Permission denied', 403);
  }

  const success = await AnnotationRepo.updateById(annotation.id, updateData);

  if (!success) {
    throw new CustomError('Annotation was not updated');
  }
}

module.exports = {
  createWithMessage,
  updateAnnotation
};
