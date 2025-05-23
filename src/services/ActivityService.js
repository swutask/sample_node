const InboxRepo = require('../repos/InboxRepo');
const InboxActivityRepo = require('../repos/InboxActivityRepo');
const BookActivityRepo = require('../repos/BookActivityRepo');
const TaskActivityRepo = require('../repos/TaskActivityRepo');
const { CustomError } = require('../errors/CustomError');
const TaskRepo = require('../repos/TaskRepo');
const { CheckService } = require('./index');

/**
 * @param userId {number}
 * @param type {'private', 'public'}
 * @param limit {number}
 * @return {Promise<*[]>}
 */
async function getInboxActivities ({
  userId,
  type = 'public',
  limit
}) {
  const inbox = await InboxRepo.getByUserId(userId);

  if (!inbox) {
    throw new CustomError('Inbox not found', 404);
  }

  return InboxActivityRepo.getAllByInboxIdAndType(inbox.id, type, {
    limit
  });
}

/**
 * @param userId {number}
 * @param inboxActivityIds {number[]}}
 * @param status {'read' | 'unread'}
 * @return {Promise<number>}
 */
async function updateInboxActivities ({
  userId,
  inboxActivityIds,
  status
}) {
  const inbox = await InboxRepo.getByUserId(userId);

  if (!inbox) {
    throw new CustomError('Inbox not found', 404);
  }

  return InboxActivityRepo.updateByIdsAndInboxId(inboxActivityIds, inbox.id, { status });
}

/**
 * @param userId {number}
 * @param inboxActivityId {number}
 * @return {Promise<*[]>}
 */
async function deleteInboxActivity ({
  userId,
  inboxActivityId
}) {
  const inbox = await InboxRepo.getByUserId(userId);

  if (!inbox) {
    throw new CustomError('Inbox not found', 404);
  }

  const success = await InboxActivityRepo.deleteByIdAndInboxId(inboxActivityId, inbox.id);

  if (!success) {
    throw new CustomError('Inbox activity not found', 404);
  }
}

/**
 * @param userId {number}
 * @param type {string}
 * @return {Promise<*[]>}
 */
async function deleteMannyInboxActivities ({
  userId,
  type
}) {
  const inbox = await InboxRepo.getByUserId(userId);

  if (!inbox) {
    throw new CustomError('Inbox not found', 404);
  }

  await InboxActivityRepo.deleteByTypeInboxId(type, inbox.id);
}

/**
 * @param bookId {number}
 * @param limit {number}
 * @return {Promise<*[]>}
 */
async function getBookActivities ({
  bookId,
  limit
}) {
  return BookActivityRepo.getAllByBookId(bookId, {
    limit
  });
}

/**
 * @param taskId {number}
 * @param userId {number}
 * @param teamId {number}
 * @param limit {number}
 * @return {Promise<*[]>}
 */
async function getTaskActivities ({
  taskId,
  userId,
  teamId,
  limit
}) {
  const task = await TaskRepo.getById(taskId);

  if (!task) {
    throw new CustomError('Task not found', 404);
  }

  try {
    await CheckService.checkUserBook({
      userId,
      teamId,
      bookIds: [
        task.bookId
      ],
      hasClientAccess: true
    });
  } catch (e) {
    throw new CustomError('Permission denied', 403);
  }

  return TaskActivityRepo.getAllByTaskId(taskId, {
    limit
  });
}

module.exports = {
  getInboxActivities,
  deleteInboxActivity,
  getBookActivities,
  getTaskActivities,
  updateInboxActivities,
  deleteMannyInboxActivities
};
