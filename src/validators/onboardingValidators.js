const joi = require('@hapi/joi');

const updateOnboardingValidator = joi.object({
  showBookOnboarding: joi.boolean(),
  showProjectOnboarding: joi.boolean(),
  showTaskOnboarding: joi.boolean(),
  showWeekPlannerOnboarding: joi.boolean(),
  showChatOnboarding: joi.boolean(),
  showFileOnboarding: joi.boolean(),
  showTeamDashboardOnboarding: joi.boolean(),
  showOverviewOnboarding: joi.boolean(),
  showCalendarOnboarding: joi.boolean(),
  showNewLookOnboarding: joi.boolean(),
  showTimelineOnboarding: joi.boolean(),
  showPostOnboarding: joi.boolean()
});

const updateOnboardingTaskSettingValidator = joi.object({
  isClosed: joi.boolean(),
  completedTasksCount: joi.number(),
  videoWatched: joi.boolean(),
  projectCreated: joi.boolean(),
  tasksCreated: joi.boolean(),
  tasksGrouped: joi.boolean(),
  profileCompleted: joi.boolean(),
  teamMemberInvited: joi.boolean()
});

module.exports = {
  updateOnboardingValidator,
  updateOnboardingTaskSettingValidator
};
