'use strict';

const Router = require('koa-router');
const { StripeService } = require('../../services');
const { jwtAuth, team } = require('../../middlewares');
const compose = require('koa-compose');
const log = require('../../log')('stripe-router');
const router = new Router({
  prefix: '/stripe'
});

router.get('/change-payment-details',
  compose([
    jwtAuth(),
    team({
      required: true,
      checkSubscription: false
    })
  ]),
  async (ctx) => {
    const userId = ctx.state.user.id;
    const teamId = ctx.state.team.id;

    try {
      const sessionId = await StripeService.createChangePaymentDetailsSession({
        teamId,
        userId
      });

      ctx.ok({ sessionId });
    } catch (err) {
      ctx.bad(400, err);
    }
  }
);

router.get('/session/:id/:userId', async ctx => {
  const userId = parseInt(ctx.params.userId);
  const planId = parseInt(ctx.params.id);
  const teamId = ctx.query.teamId;

  ctx.test(userId, 400, 'No user id');
  ctx.test(planId, 400, 'No plan id');

  try {
    const id = await StripeService.upgradeSubscription({
      userId: userId,
      planId: planId,
      teamId,
      expire: ctx.query.expire,
      signature: ctx.query.signature
    });

    ctx.ok({ id: id });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/invoices', compose([jwtAuth(), team()]), async ctx => {
  try {
    const result = await StripeService.getInvoices({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok({ invoices: result });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.delete('/', compose([jwtAuth(), team()]), async ctx => {
  try {
    await StripeService.cancelSubscription({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });
    ctx.ok();
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.post('/webhook', async ctx => {
  const sig = ctx.headers['stripe-signature'];
  const body = ctx.request.rawBody;

  try {
    const event = await StripeService.validateWebhook({
      sig: sig,
      body: body,
      privateKey: process.env.STRIPE_SECRET,
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });
    await StripeService.parseWebhook(event, process.env.STRIPE_SECRET);
  } catch (err) {
    log.error(err);
  }
  ctx.ok();
});

module.exports = router;
