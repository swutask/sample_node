'use strict';

// DEPRECATED

const { required } = require('../utils');
const axios = require('axios');
const models = require('../models');
const { sequelize } = require('../loaders');

const PROVIDER = 'ApplePay';

class ApplePayService {
  static async validateReceipt ({
    receipt = required(),
    userId = required()
  } = {}) {
    try {
      const url = process.env.APPLE_PAY_URL;

      const body = {
        'receipt-data': receipt,
        password: process.env.APPLE_PAY_PASSWORD
      };

      const { data } = await axios.post(url, body);

      if (data.status === 21007) { // This receipt is from the test environment, but it was sent to the production environment for verification.
        return axios.post('https://sandbox.itunes.apple.com/verifyReceipt', body);
      }

      await models.applePayReceipt.create({
        data: JSON.stringify(data)
      });

      const bundleId = process.env.APPLE_PAY_BUNDLE_ID;

      if (data.status !== 0) throw new Error(`Error: status code - ${data.status}.`);
      if (data.receipt.bundle_id !== bundleId) throw new Error('Bundle Id is incorrect');
      // if (data.environment === 'Sandbox') throw new Error('Sandbox');

      const inApp = data.receipt.in_app[0];

      await this._createSubscription({
        userId: userId,
        productId: inApp.product_id,
        subscriptionId: inApp.original_transaction_id
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  static async _createSubscription ({
    userId,
    productId,
    subscriptionId
  } = {}) {
    const plan = await models.plan.findOne({
      where: {
        provider: PROVIDER,
        data: {
          productId: productId
        }
      }
    });
    if (!plan) throw new Error('Plan not found');

    const date = new Date();

    if (plan.recurringPer === 'month') {
      date.setMonth(date.getMonth() + plan.recurringPeriod);
    } else if (plan.recurringPer === 'year') {
      date.setFullYear(date.getFullYear() + plan.recurringPeriod);
    }

    await sequelize.sequelize.transaction(async t => {
      // Deactivate all prev subscriptions for user
      await models.subscription.update({
        isActive: false
      }, {
        where: {
          userId: userId
        },
        transaction: t
      });
      // Create new one active subscription
      await models.subscription.create({
        planId: plan.id,
        userId: userId,
        expireAt: date,
        version: 0,
        data: {
          subscriptionId: subscriptionId
        }
      }, {
        transaction: t
      });
    });
  }

  static async parseWebhook (data) {
    await models.applePayWebhook.create({
      data: JSON.stringify(data)
    });

    const bundleId = process.env.APPLE_PAY_BUNDLE_ID;
    const password = process.env.APPLE_PAY_PASSWORD;

    if (data.unified_receipt.status !== 0) throw new Error(`Error: status code - ${data.unified_receipt.status}.`);
    if (data.bid !== bundleId || data.password !== password) throw new Error('Permission denied!');
    // if (data.environment === 'Sandbox') throw new Error('Sandbox');

    const plan = await models.plan.findOne({
      where: {
        provider: PROVIDER,
        data: {
          productId: data.auto_renew_product_id
        }
      }
    });
    if (!plan) throw new Error('Plan not found');

    const date = new Date();
    if (plan.recurringPer === 'month') {
      date.setMonth(date.getMonth() + plan.recurringPeriod);
    } else if (plan.recurringPer === 'year') {
      date.setFullYear(date.getFullYear() + plan.recurringPeriod);
    }

    const transactionId = data.unified_receipt.latest_receipt_info[0].original_transaction_id;

    if (data.notification_type === 'DID_RECOVER' || data.notification_type === 'DID_RENEW') {
      const [count] = await models.subscription.update({
        expireAt: date
      }, {
        where: {
          planId: plan.id,
          isActive: true,
          data: {
            subscriptionId: transactionId
          }
        }
      });
      if (count === 0) throw new Error('Subscription for renewal not found');
    } else if (data.notification_type === 'CANCEL') {
      this._cancelSubscription(transactionId);
    }
  }

  static async _cancelSubscription ({
    original_transaction_id = required()
  } = {}) {
    const plans = await models.plan.findAll({
      attributes: ['id'],
      where: {
        provider: PROVIDER
      }
    });
    if (!plans) throw new Error('Plans not found');

    const sub = await models.subscription.findAll({
      attributes: ['data', 'id'],
      where: {
        isActive: true,
        planId: plans.map(p => p.id),
        isCancelled: false,
        data: {
          subscriptionId: original_transaction_id
        }
      },
      limit: 1,
      order: [
        ['id', 'desc']
      ]
    });
    if (sub.length < 1) throw new Error('No subscription to cancel for user');

    const s = sub[0];
    s.isCancelled = true;
    await s.save();
  }
}

module.exports = ApplePayService;
