'use strict';

const { required } = require('../utils');
const { stripe } = require('../libs');
const { sequelize } = require('../loaders');
const models = require('../models');
const config = require('../config');
const OnboardingService = require('./OnboardingService');
const StripeUserRepo = require('../repos/StripeUserRepo');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const SubscriptionRepo = require('../repos/SubscriptionRepo');
const StatService = require('./StatService');
const PlanRepo = require('../repos/PlanRepo');
const log = require('../log')('StripeService');

const PROVIDER = 'Stripe';

class StripeService {
  static async parseWebhook (event, privateKey) {
    await models.stripeWebhook.create({
      data: JSON.stringify(event)
    });

    switch (event.type) {
      case ('invoice.payment_succeeded') : {
        const obj = event.data.object;
        const reason = obj.billing_reason;
        const subscriptionId = obj.subscription;
        const customer = obj.customer;
        const lines = obj.lines;
        const priceId = lines.data[0].price.id;

        const plan = await models.plan.findOne({
          where: {
            provider: PROVIDER,
            data: {
              priceId: priceId
            }
          }
        });
        if (!plan) throw new Error('Plan by price not found');

        const stripeUser = await StripeUserRepo.getStripeUser({ stripeId: customer });

        if (!stripeUser) throw new Error('Stripe user not found');

        const date = new Date();
        if (plan.recurringPer === 'month') {
          date.setMonth(date.getMonth() + plan.recurringPeriod);
        } else if (plan.recurringPer === 'year') {
          date.setFullYear(date.getFullYear() + plan.recurringPeriod);
        }

        if (reason === 'subscription_create') {
          if (stripeUser.teamId) {
            const adminRole = await models.teamRole.findOne({
              attributes: ['id'],
              where: {
                name: 'admin'
              }
            });

            await models.teamMember.update({
              teamRoleId: adminRole.id,
              hasBillingAccess: true
            },
            {
              where: {
                teamId: stripeUser.teamId
              }
            });
          }

          try {
            await this.cancelSubscription({
              userId: stripeUser.userId,
              teamId: stripeUser.teamId
            });
          } catch (error) {
            console.log('cancelSubscription', error);
          }

          // Deactivate all prev subscriptions for user
          try {
            await SubscriptionRepo.updateSubscription({
              isActive: false
            }, {
              teamId: stripeUser.teamId
            });
          } catch (error) {
            console.log('updateSubscription', error);
          }

          // Create new one active subscription
          try {
            await SubscriptionRepo.createSubscription({
              planId: plan.id,
              teamId: stripeUser.teamId,
              expireAt: date,
              data: {
                subscriptionId: subscriptionId
              }
            });
          } catch (error) {
            console.log('createSubscription', error);
          }
        } else if (reason === 'subscription_cycle') {
          await SubscriptionRepo.updateSubscription({
            expireAt: date
          }, {
            userId: stripeUser.teamId ? null : stripeUser.userId,
            teamId: stripeUser.teamId,
            planId: plan.id,
            isActive: true,
            data: {
              subscriptionId: subscriptionId
            }
          });
        }

        break;
      }

      case ('checkout.session.completed'): {
        await this._handleSetupCheckoutSession(event.data.object, privateKey);

        break;
      }
    }
  }

  /**
   * @param data {{
   *  "id": string,
   *  "object": string,
   *  "billing_address_collection": null | *,
   *  "cancel_url": string,
   *  "client_reference_id": null | string,
   *  "customer": string,
   *  "customer_email": null | string,
   *  "display_items": [],
   *  "mode": "setup",
   *  "setup_intent": string,
   *  "submit_type": null | stripe,
   *  "subscription": null | *,
   *  "success_url": string
   * }}
   * @return {Promise<void>}
   * @private
   */
  static async _handleSetupCheckoutSession (data, privateKey) {
    if (data.mode !== 'setup') {
      return;
    }

    const setupIntent = await stripe.retrieveSetupIntents({
      privateKey,
      intentId: data.setup_intent
    });

    await stripe.setDefaultInvoicesPaymentMethod({
      privateKey,
      customerId: setupIntent.customer,
      paymentMethodId: setupIntent.payment_method
    });
  }

  static async validateWebhook ({
    sig = required(),
    body = required(),
    secret = required(),
    privateKey = required()
  } = {}) {
    const event = await stripe.validateWebhook({
      sig: sig,
      body: body,
      secret: secret,
      privateKey: privateKey
    });
    return event;
  }

  static async cancelSubscription ({
    teamId = required()
  } = {}) {
    const subscription = await SubscriptionRepo.getActiveSubscription({ teamId }, {
      include: [{
        model: models.plan
      }]
    });

    if (subscription.plan?.name === 'Trial plan' || subscription.plan?.name === 'Free plan') {
      return;
    }

    const { subscriptionId } = subscription.data;

    if (subscriptionId) {
      await stripe.cancelSubscription({
        subId: subscriptionId,
        privateKey: process.env.STRIPE_SECRET
      });
    }

    subscription.isCancelled = true;
    await subscription.save();
  }

  static async validatePlan ({
    userId = required(),
    teamId = required(),
    plan = required()
  }) {
    const stats = await StatService.getStats({
      userId,
      teamId
    });
    const statPlanColumnMap = {
      clients: 'maxClients',
      projects: 'maxProjects',
      books: 'maxBooks',
      size: 'maxSize',
      members: 'maxMembers',
      tasks: 'maxTasks'
    };

    Object.entries(stats).forEach(([statName, statValue]) => {
      const planColumnName = statPlanColumnMap[statName];

      if (!planColumnName) {
        return;
      }

      const planValue = plan[planColumnName];

      if (!planValue || planValue === -1) {
        return;
      }

      if (statValue > planValue) {
        throw new Error(`Exceeded ${statName} limit`);
      }
    });
  }

  static async upgradeSubscription ({
    userId = required(),
    teamId = null,
    planId = required(),
    expire,
    signature
  } = {}) {
    const plan = await PlanRepo.getById(planId);

    if (!plan) {
      throw new Error('Plans not found');
    }

    await this.validatePlan({
      userId,
      teamId,
      plan
    });

    if (plan.name === 'Free Plan') {
      await this.cancelSubscription({
        userId,
        teamId
      });

      await SubscriptionRepo.createSubscription({
        planId: plan.id,
        teamId: teamId,
        data: {}
      });

      await StripeUserRepo.destroyStripeUser(teamId);
    } else {
      return this.createSessions({
        userId,
        teamId,
        planId,
        expire,
        signature
      });
    }
  }

  static async createSessions ({
    userId = required(),
    teamId = required(),
    planId = required()
  } = {}) {
    const plan = await models.plan.findOne({
      where: {
        id: planId,
        provider: PROVIDER
      }
    });

    if (!plan) throw new Error('Plan not found');

    const sub = await SubscriptionRepo.getActiveSubscription({ teamId });

    if (sub) {
      const subPlan = await models.plan.findByPk(sub.planId);

      if (!subPlan) throw new Error('Plan not found');
    }

    const members = await models.teamMember.findAll({
      where: {
        teamId
      }
    });

    const quantity = members?.length || 1;

    const stripeId = await sequelize.sequelize.transaction(async t => {
      const old = await StripeUserRepo.getStripeUser({ teamId }, t);

      if (!old) {
        const user = await models.user.findByPk(userId);
        if (!user) throw new Error('User not found');

        const newStripeUser = await stripe.createUser({
          email: user.email,
          privateKey: process.env.STRIPE_SECRET
        });

        await StripeUserRepo.createStripeUser({
          teamId,
          stripeId: newStripeUser.id
        }, t);
        return newStripeUser.id;
      } else {
        return old.stripeId;
      }
    });

    const coupon = await OnboardingService.getOnboardingCoupon(teamId, plan);

    const session = await stripe.createSession({
      privateKey: process.env.STRIPE_SECRET,
      customer: stripeId,
      price: plan.data.priceId,
      quantity: quantity,
      successUrl: `${config.proto}://${config.frontendDomain}${config.stripe.successTeamUrl}`,
      cancelUrl: `${config.proto}://${config.frontendDomain}${config.stripe.cancelTeamUrl}`,
      coupon
    });

    return session.id;
  }

  static async updateSubscription ({
    teamId = required()
  } = {}) {
    const sub = await SubscriptionRepo.getActiveSubscription({ teamId });

    const plan = await models.plan.findOne({
      where: {
        id: sub.planId
      }
    });

    if (plan.name === 'Trial Plan' || plan.name === 'Free Plan') {
      log.error(`Wrong plan for subscription update (teamId = ${teamId})`);

      return;
    }

    const members = await models.teamMember.findAll({
      where: {
        teamId: teamId
      }
    });

    if (plan.name === 'Personal Pro Plan Yearly' || plan.name === 'Personal Pro Plan Monthly') {
      await SubscriptionRepo.upgradeToTeamPlan({
        teamId,
        quantity: members.length
      });
    } else {
      const subscriptionId = sub.data.subscriptionId;

      await stripe.updateSubscription({
        privateKey: process.env.STRIPE_SECRET,
        subscriptionId: subscriptionId,
        quantity: members.length
      });
    }
  }

  static async getInvoices ({
    userId,
    teamId = required()
  } = {}) {
    const result = [];

    const teamMember = await TeamMemberRepo.getByUserId(userId);

    if (!teamMember?.hasBillingAccess) {
      throw new Error('Permission denied');
    }

    await SubscriptionRepo.getActiveSubscription({ teamId });

    const stripeUser = await StripeUserRepo.getStripeUser({ teamId });

    if (stripeUser) {
      const { data } = await stripe.getInvoices({
        customer: stripeUser.stripeId,
        privateKey: process.env.STRIPE_SECRET
      });

      data.forEach(d => {
        result.push({
          createdAt: new Date(d.created * 1000),
          currency: d.currency,
          amount: d.amount_paid / 100,
          url: d.hosted_invoice_url
        });
      });
    }

    return result;
  }

  static async createChangePaymentDetailsSession ({
    userId = required(),
    teamId = required()
  }) {
    const teamMember = await TeamMemberRepo.getByUserId(userId);
    const subscription = await SubscriptionRepo.getActiveSubscription({ teamId });

    if (!subscription?.data?.subscriptionId || !teamMember?.hasBillingAccess) {
      throw new Error('Permission denied');
    }

    const stripeUser = await StripeUserRepo.getStripeUser({ teamId });

    if (!stripeUser?.stripeId) {
      throw new Error('Stripe user not found');
    }

    const session = await stripe.createSetupSession({
      customerId: stripeUser.stripeId,
      privateKey: process.env.STRIPE_SECRET,
      subscriptionId: subscription.data.subscriptionId,
      successUrl: `${config.proto}://${config.frontendDomain}${config.stripe.changePaymentMethod.successTeamUrl}`,
      cancelUrl: `${config.proto}://${config.frontendDomain}${config.stripe.changePaymentMethod.cancelTeamUrl}`
    });

    return session.id;
  }
}

module.exports = StripeService;
