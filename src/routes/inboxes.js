'use strict';

const Router = require('koa-router');
const { jwtAuth } = require('../middlewares');
const InboxService = require('../services/InboxService');
const joi = require('@hapi/joi');
const compose = require('koa-compose');
const {
  team,
  pagination
} = require('../middlewares/index');
const ActivityController = require('../controllers/ActivityController');

const router = new Router({
  prefix: '/inboxes'
});
const updateSchema = joi.object({
  mutedUntil: joi.date().allow(null),
  receiveEmailNotifications: joi.boolean(),
  receiveWeeklyPersonalEmailNotifications: joi.boolean(),
  emailProjectInvite: joi.boolean(),
  emailMentionCreate: joi.boolean(),
  emailRoleChange: joi.boolean(),
  emailTaskAssign: joi.boolean(),
  emailTaskUnassign: joi.boolean(),
  emailTaskChange: joi.boolean(),
  emailTaskCommentAdd: joi.boolean(),
  emailTaskCompleted: joi.boolean(),
  emailChatMessageReceive: joi.boolean(),
  receiveTaskDeadlineNotifications: joi.boolean(), // TODO: let FE know that this field was changed
  receiveDailyTasksNotifications: joi.boolean(),
  pushProjectInvite: joi.boolean(),
  pushMentionCreate: joi.boolean(),
  pushRoleChange: joi.boolean(),
  pushTaskAssign: joi.boolean(),
  pushTaskUnassign: joi.boolean(),
  pushTaskChange: joi.boolean(),
  pushTaskCommentAdd: joi.boolean(),
  pushTaskCompleted: joi.boolean(),
  pushChatMessageReceive: joi.boolean()
});

router.patch('/', jwtAuth(), async ctx => {
  try {
    const data = await updateSchema.validateAsync(ctx.request.body, {
      stripUnknown: true
    });
    const inbox = await InboxService.update({
      userId: ctx.state.user.id,
      data
    });

    ctx.ok({
      inbox
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/', jwtAuth(), async ctx => {
  try {
    const inbox = await InboxService.get({
      userId: ctx.state.user.id
    });

    ctx.ok({
      inbox
    });
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get(
  '/activities',
  compose([
    jwtAuth(),
    team({ required: true }),
    pagination()
  ]),
  ActivityController.getInboxActivities
);

router.patch(
  '/activities',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  ActivityController.updateInboxActivities
);

router.delete(
  '/activities/:inboxActivityId',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  ActivityController.deleteInboxActivity
);

router.delete(
  '/activities',
  compose([
    jwtAuth(),
    team({ required: true })
  ]),
  ActivityController.deleteMannyInboxActivities
);

module.exports = router;
