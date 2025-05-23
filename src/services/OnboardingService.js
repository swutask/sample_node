const { required } = require('../utils');
const OnboardingRepo = require('../repos/OnboardingRepo');
const OnboardingTaskSettingRepo = require('../repos/OnboardingTaskSettingRepo');
const { CustomError } = require('../errors/CustomError');
const DiscountRepo = require('../repos/DiscountRepo');
const { stripe } = require('../libs');

/**
 * @param data {Object}
 * @param userId {number}
 * @returns {Promise<*>}
 */
async function updateOnboarding ({
  data = required(),
  userId = required()
}) {
  const updatedOnboarding = await OnboardingRepo.updateByUserId(userId, data);

  if (!updatedOnboarding) {
    throw new CustomError('Onboarding not found', 404);
  }

  return updatedOnboarding;
}

async function updateCompletedTasks (teamId) {
  const onboardingTaskSetting = await OnboardingTaskSettingRepo.getByTeamId(teamId);

  const completedTasksCount = onboardingTaskSetting?.completedTasksCount;

  if (completedTasksCount >= 25) return;

  const completedTasks = completedTasksCount < 25 ? completedTasksCount + 1 : completedTasksCount;

  const updatedOnboardingTaskSetting = await OnboardingTaskSettingRepo.updateByTeamId(
    teamId,
    { completedTasksCount: completedTasks }
  );

  if (!updatedOnboardingTaskSetting) {
    throw new CustomError('Onboarding task settings not found', 404);
  }

  return updatedOnboardingTaskSetting;
}

/**
 * @param teamId {number}
 * @param plan {Object}
 * @returns {Promise<*|null>}
*/
async function getOnboardingCoupon (teamId, plan) {
  const onboardingTaskSetting = await OnboardingTaskSettingRepo.getByTeamId(teamId);

  if (onboardingTaskSetting?.completedTasksCount === 25) {
    const existingCoupons = await DiscountRepo.getAllByTeamIdAndType(teamId, 'coupon');
    const retrievedCoupons = [];

    if (existingCoupons.length > 0) {
      for (const existingCoupon of existingCoupons) {
        const coupon = await stripe.retrieveCoupon({
          privateKey: process.env.STRIPE_SECRET,
          couponId: existingCoupon.externalId
        });

        retrievedCoupons.push(coupon);
      }

      if (retrievedCoupons.some(c => !c.valid)) return;

      const couponForCurrentPlan = existingCoupons.find(c => c.appliesTo === plan.name);

      if (couponForCurrentPlan) return couponForCurrentPlan.externalId;
    }

    // const duration = plan.name === 'Pro Plan Yearly' ? 'once' : 'repeating';
    // const durationInMonths = plan.name === 'Pro Plan Yearly' ? undefined : 2;
    // const percentOff = plan.name === 'Pro Plan Yearly' ? 16.66 : 100;

    // const coupon = await DiscountService.create({
    //   type: 'coupon',
    //   data: {
    //     duration,
    //     durationInMonths,
    //     maxRedemptions: 1,
    //     name: '2 months for free',
    //     percentOff
    //   },
    //   appliesToPlan: plan.name,
    //   teamId
    // });

    // return coupon.externalId;
    return null;
  }
}

async function updateTaskSettings ({
  data,
  teamId
}) {
  const updatedOnboardingTaskSetting = await OnboardingTaskSettingRepo.updateByTeamId(teamId, data);

  if (!updatedOnboardingTaskSetting) {
    throw new CustomError('Onboarding task settings not found', 404);
  }

  const canCreateDiscount = validateOnboardingTaskSetting(updatedOnboardingTaskSetting);

  if (!canCreateDiscount) {
    return updatedOnboardingTaskSetting;
  }

  const existingDiscount = await DiscountRepo.getByTeamIdAndType(teamId, 'credit');

  if (existingDiscount) {
    return updatedOnboardingTaskSetting;
  }

  return updatedOnboardingTaskSetting;
}

/**
 * @param onboardingTaskSetting {Record<string, number | boolean>}
 * @returns {boolean}
 */
function validateOnboardingTaskSetting (onboardingTaskSetting) {
  const keysToCheck = [
    'completedTasksCount',
    'projectCreated',
    'tasksGrouped',
    'profileCompleted',
    'teamMemberInvited'
  ];

  for (const [key, value] of Object.entries(onboardingTaskSetting)) {
    if (!keysToCheck.includes(key)) {
      continue;
    }

    if (!value) {
      return false;
    }
  }

  return true;
}

/**
 * @param teamId {number}
 * @returns {Promise<*>}
 */
async function getTaskSettings ({
  teamId = required()
}) {
  const onboardingTaskSetting = await OnboardingTaskSettingRepo.getByTeamId(teamId);

  if (!onboardingTaskSetting) {
    return null;
  }

  return onboardingTaskSetting;
}

module.exports = {
  updateOnboarding,
  updateTaskSettings,
  getTaskSettings,
  updateCompletedTasks,
  getOnboardingCoupon
};
