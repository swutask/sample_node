'use strict';

const Router = require('koa-router');
const { stripe, applePay } = require('./payments');
const { jwtAuth, team } = require('../middlewares');
const { PlanService } = require('../services');
const SubscriptionController = require('../controllers/SubscriptionController');
const compose = require('koa-compose');
const config = require('../config');

const router = new Router({
  prefix: '/payment'
});

router.get('/plans', async ctx => {
  try {
    const plans = await PlanService.getPlans();

    ctx.ok({
      trialDuration: config.trialDuration,
      plans: plans
    });
  } catch (err) {
    ctx.bad(400, err);
  }
});

router.get('/',
  compose([
    jwtAuth(),
    team({ checkSubscription: false })
  ]),
  async ctx => {
    try {
      const plan = await PlanService.getSubscription({
        userId: ctx.state.user.id,
        teamId: ctx.state.team?.id
      });
      ctx.ok(plan);
    } catch (err) {
      ctx.bad(400, err);
    }
  }
);

router.post(
  '/subscriptions/extend',
  compose([
    jwtAuth(),
    team({ required: true, checkSubscription: false })
  ]),
  SubscriptionController.extendTrial
);

router.use(stripe.routes());
router.use(applePay.routes());

module.exports = router;
