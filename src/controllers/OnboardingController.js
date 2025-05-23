const OnboardingService = require('../services/OnboardingService');
const { updateOnboardingValidator, updateOnboardingTaskSettingValidator } = require('../validators/onboardingValidators');
const { catchError } = require('../controllers/common/hof');

async function updateOnboarding (ctx) {
  const userId = ctx.state.user.id;

  const data = await updateOnboardingValidator.validateAsync(ctx.request.body, {
    stripUnknown: true
  });

  const onboarding = await OnboardingService.updateOnboarding({
    data,
    userId
  });

  ctx.ok({
    onboarding
  });
}

async function updateTaskSettings (ctx) {
  const teamId = ctx.state.team.id;

  const data = await updateOnboardingTaskSettingValidator.validateAsync(ctx.request.body, {
    stripUnknown: true
  });

  const onboardingTaskSettings = await OnboardingService.updateTaskSettings({
    data,
    teamId
  });

  ctx.ok({
    onboardingTaskSettings
  });
}

async function getTaskSettings (ctx) {
  const teamId = ctx.state.team.id;

  const onboardingTaskSettings = await OnboardingService.getTaskSettings({
    teamId
  });

  ctx.ok({
    onboardingTaskSettings
  });
}

module.exports = {
  updateOnboarding: catchError(updateOnboarding),
  updateTaskSettings: catchError(updateTaskSettings),
  getTaskSettings: catchError(getTaskSettings)
};
