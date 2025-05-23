'use strict';

const Router = require('koa-router');
const { ChatService, PrivateChatService } = require('../services');
const { jwtAuth, team, pagination } = require('../middlewares');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const MessageService = require('../services/MessageService');
const MessageController = require('../controllers/MessageController');

const router = new Router({
  prefix: '/chats'
});

const createMessageSchema = joi.object({
  text: joi.string().required(),
  taskId: joi.number(),
  attachmentIds: joi.array().items(joi.number()),
  replyId: joi.number(),
  threadId: joi.number(),
  resolvedAt: joi.date().allow(null)
});

const updateMessageSchema = joi.object({
  text: joi.string(),
  taskId: joi.number(),
  attachmentIds: joi.array().items(joi.number()),
  replyId: joi.number().allow(null),
  threadId: joi.number().allow(null),
  resolvedAt: joi.date().allow(null)
});

const updateMuteSchema = joi.object({
  mutedAt: joi.string().allow(null).required()
});

const createPrivateChatSchema = joi.object({
  memberId: joi.number().required()
});

const createMessagePathAttributesSchema = joi.object({
  messageId: joi.number().required(),
  reactionId: joi.number().required()
});

const deleteMessagePathAttributesSchema = joi.object({
  messageId: joi.number().required(),
  reactionId: joi.number().required()
});

router.get(
  '/messages/unread-count',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  MessageController.getUnreadCount
);

router.post('/message/:chatId', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const chatId = parseInt(ctx.params.chatId);
  const bookId = ctx.query.bookId;

  try {
    const data = await createMessageSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.chatId = chatId;
    data.bookId = bookId;

    const message = await ChatService.addMessage(data);

    ctx.ok(message);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/messages/:chatId', compose([jwtAuth(), team(), pagination()]), async ctx => {
  const chatId = parseInt(ctx.params.chatId);
  const bookId = ctx.query.bookId;
  const threadId = ctx.query.threadId;

  try {
    const messages = await ChatService.getMessages({
      bookId,
      chatId,
      threadId,
      teamId: ctx.state.team?.id,
      userId: ctx.state.user.id,
      limit: ctx.pagination.limit,
      page: ctx.pagination.page
    });

    ctx.ok(messages);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/updateMessage/:id/:chatId', compose([jwtAuth(), team()]), async ctx => {
  const body = ctx.request.body;
  const bookId = ctx.query.bookId;
  const chatId = parseInt(ctx.params.chatId);
  const id = parseInt(ctx.params.id);

  ctx.test(chatId, 400, 'No chatId');
  ctx.test(id, 400, 'No id');

  try {
    const data = await updateMessageSchema.validateAsync(body, {
      stripUnknown: true
    });

    data.id = id;
    data.userId = ctx.state.user.id;
    data.teamId = ctx.state.team?.id;
    data.bookId = bookId;
    data.chatId = chatId;

    await ChatService.updateMessage(data);
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/deleteMessage/:id/:chatId', compose([jwtAuth(), team()]), async ctx => {
  const id = parseInt(ctx.params.id);
  const bookId = ctx.query.bookId;
  const chatId = parseInt(ctx.params.chatId);

  ctx.test(id, 400, 'No id');
  ctx.test(chatId, 400, 'No chatId');

  try {
    await ChatService.deleteMessage({
      id,
      bookId,
      chatId,
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/status/:chatId', compose([jwtAuth(), team()]), async ctx => {
  const chatId = parseInt(ctx.params.chatId);

  ctx.test(chatId, 400, 'No chat id');

  try {
    await ChatService.updateMessageStatus({
      userId: ctx.state.user.id,
      chatId: chatId
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.put('/mute/:chatId', compose([jwtAuth(), team()]), async ctx => {
  const chatId = parseInt(ctx.params.chatId);
  const body = ctx.request.body;

  ctx.test(chatId, 400, 'No message id');

  try {
    const { mutedAt } = await updateMuteSchema.validateAsync(body, {
      stripUnknown: true
    });

    await ChatService.updateMute({
      userId: ctx.state.user.id,
      chatId: chatId,
      mutedAt: mutedAt
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/private', compose([jwtAuth(), team()]), async (ctx) => {
  const teamId = ctx.state.team?.id;
  const creatorId = ctx.state.user.id;

  ctx.test(teamId, 400, 'No team id');

  const body = ctx.request.body;

  try {
    const { memberId } = await createPrivateChatSchema.validateAsync(body, {
      stripUnknown: true
    });
    const privateChatData = await PrivateChatService.create({
      teamId,
      creatorId,
      memberId
    });

    ctx.ok({
      privateChat: privateChatData.privateChat,
      chatSetting: privateChatData.chatSetting,
      opponent: privateChatData.opponent
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/private', jwtAuth(), async (ctx) => {
  const userId = ctx.state.user.id;

  try {
    const privateChats = await PrivateChatService.getAll({
      userId
    });

    ctx.ok({ privateChats: privateChats });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post('/messages/:messageId/reactions/:reactionId', compose([jwtAuth(), team()]), async (ctx) => {
  const teamId = ctx.state.team?.id;
  const userId = ctx.state.user.id;

  ctx.test(teamId, 400, 'No team id');

  try {
    const {
      reactionId,
      messageId
    } = await createMessagePathAttributesSchema.validateAsync(ctx.params, {
      stripUnknown: true
    });
    await MessageService.addReaction({
      userId,
      messageId,
      reactionId,
      teamId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.delete('/messages/:messageId/reactions/:reactionId', compose([jwtAuth(), team()]), async (ctx) => {
  const teamId = ctx.state.team?.id;
  const userId = ctx.state.user.id;

  ctx.test(teamId, 400, 'No team id');

  try {
    const {
      reactionId,
      messageId
    } = await deleteMessagePathAttributesSchema.validateAsync(ctx.params, {
      stripUnknown: true
    });
    await MessageService.removeReaction({
      userId,
      messageId,
      reactionId,
      teamId
    });

    ctx.ok();
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.post(
  '/messages/:messageId/resolve',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  MessageController.resolve
);

router.delete(
  '/messages/:messageId/resolve',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  MessageController.unresolve
);

module.exports = router;
