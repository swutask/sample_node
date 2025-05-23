'use strict';

const { required } = require('../utils');
const Stripe = require('stripe');

module.exports = {
  createUser: async ({
    privateKey = required(),
    email = required()
  } = {}) => {
    const stripe = Stripe(privateKey);
    const user = await stripe.customers.create({
      email: email
    });
    return user;
  },
  cancelSubscription: async ({
    privateKey = required(),
    subId = required()
  } = {}) => {
    const stripe = Stripe(privateKey);
    await stripe.subscriptions.del(
      subId
    );
  },
  deleteUser: async ({
    privateKey = required(),
    customer = required()
  } = {}) => {
    const stripe = Stripe(privateKey);
    await stripe.customers.del(customer);
  },
  getInvoices: async ({
    privateKey = required(),
    customer = required()
  } = {}) => {
    const stripe = Stripe(privateKey);
    return await stripe.invoices.list({
      customer
    });
  },
  createSession: async ({
    privateKey = required(),
    price = required(),
    customer = required(),
    successUrl = required(),
    cancelUrl = required(),
    mode = 'subscription',
    quantity = required(),
    coupon
  } = {}) => {
    let discounts;

    if (coupon) {
      discounts = [{
        coupon: coupon
      }];
    }

    const stripe = Stripe(privateKey);
    const session = await stripe.checkout.sessions.create({
      customer: customer,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [
        {
          price: price,
          quantity: quantity
        }
      ],
      discounts,
      mode: mode
    });
    return session;
  },
  updateSubscription: async ({
    privateKey = required(),
    subscriptionId = required(),
    quantity = required(),
    prorationBehavior = 'always_invoice',
    newPriceId
  } = {}) => {
    const stripe = Stripe(privateKey);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: prorationBehavior,
      payment_behavior: 'error_if_incomplete',
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId || subscription.plan.id,
        quantity: quantity
      }]
    });
  },
  validateWebhook: async ({
    privateKey = required(),
    sig = required(),
    body = required(),
    secret = required()
  } = {}) => {
    const stripe = Stripe(privateKey);
    const event = await stripe.webhooks.constructEvent(body, sig, secret);
    return event;
  },
  /**
   * @param privateKey {string}
   * @param customerId {string}
   * @param subscriptionId {string}
   * @param successUrl {string}
   * @param cancelUrl {string}
   * @return {Promise<{
   *   id: string
   * }>}
   */
  async createSetupSession  ({
    privateKey = required(),
    customerId = required(),
    subscriptionId = required(),
    successUrl = required(),
    cancelUrl = required()
  }) {
    const stripe = Stripe(privateKey);

    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customerId,
      setup_intent_data: {
        metadata: {
          customer_id: customerId,
          subscription_id: subscriptionId
        }
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });
  },
  /**
   * @param privateKey {string}
   * @param intentId {string}
   * @return {Promise<{
   *   customer: string,
   *   metadata: {
   *    subscription_id: string
   *   },
   *   payment_method: string
   * }>}
   */
  async retrieveSetupIntents ({
    privateKey = required(),
    intentId = required()
  }) {
    const stripe = Stripe(privateKey);

    return stripe.setupIntents.retrieve(intentId);
  },
  /**
   * @param privateKey {string}
   * @param customerId {string}
   * @param paymentMethodId {string}
   * @return {Promise<*>}
   */
  async setDefaultInvoicesPaymentMethod ({
    privateKey = required(),
    customerId = required(),
    paymentMethodId = required()
  }) {
    const stripe = Stripe(privateKey);

    return stripe.customers.update(
      customerId,
      {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      }
    );
  },

  /**
    * @param privateKey {string}
    * @param data {{
    *   amount_off: number,
    *   applies_to: products: Array<string>,
    *   currency: string,
    *   duration: 'forever' | 'once' | 'repeating',
    *   duration_in_months: number,
    *   expand: Array<string>,
    *   id: string,
    *   max_redemptions: number,
    *   name: string,
    *   percent_off: number,
    *   redeem_by: number,
    * }}
    * @returns {Promise<string>}
  */
  async createCoupon ({
    privateKey = required(),
    data = required()
  } = {}) {
    const stripe = Stripe(privateKey);

    const createdCoupon = await stripe.coupons.create({
      currency: 'USD',
      amount_off: data.amountOff,
      applies_to: data.appliesTo,
      duration: data.duration,
      duration_in_months: data.durationInMonths,
      expand: data.expand,
      id: data.id,
      max_redemptions: data.maxRedemptions,
      name: data.name,
      percent_off: data.percentOff,
      redeem_by: data.redeemBy
    });

    return createdCoupon.id;
  },

  /**
   * @param privateKey
   * @param couponId
   * @returns {Promise<{
   *  id: string,
   *  valid: boolean,
   *  currency: string
   * }>}
   */
  async retrieveCoupon ({
    privateKey = required(),
    couponId = required()
  }) {
    const stripe = Stripe(privateKey);

    const coupon = await stripe.coupons.retrieve(couponId);

    return {
      id: coupon.id,
      currency: coupon.currency,
      valid: coupon.valid
    };
  },

  /**
   * @param privateKey {string}
   * @param customerId {string}
   * @param amountInUSDCents {number}
   * @returns {Promise<void>}
   */
  async updateBalance ({
    privateKey = required(),
    customerId = required(),
    amountInUSDCents = required()
  }) {
    const stripe = Stripe(privateKey);

    await stripe.customers.createBalanceTransaction(customerId, {
      amount: amountInUSDCents,
      currency: 'USD'
    });
  }
};
