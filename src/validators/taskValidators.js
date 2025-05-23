const joi = require('@hapi/joi');
const {
  rules,
  validators
} = require('./common');

const getByBookIdsValidator = joi.object({
  ids: rules.numericStringList(),
  tagIds: rules.numericStringList(),
  startDate: joi.date(),
  endDate: joi.date(),
  completedAtFrom: joi.date(),
  completedAtTo: joi.date(),
  withoutCompleted: joi
    .boolean()
    .when('completedAtFrom', {
      is: joi.exist(),
      then: validators.shouldNotExist('any.unknown')
    })
    .when('completedAtTo', {
      is: joi.exist(),
      then: validators.shouldNotExist('any.unknown')
    }),
  urgencyStatuses: rules.numericStringList([1, 2, 3, 4]),
  teamMemberIds: rules.numericStringList(),
  search: joi.string().min(2),
  bookIds: rules.numericStringList(),
  titleOrder: rules.sortString(),
  updatedAtOrder: rules.sortString(),
  createdAtOrder: rules.sortString(),
  endDateOrder: rules.sortString(),
  urgentStatusOrder: rules.sortString(),
  storyPointsOrder: rules.sortString(),
  firstNameOrderTeamMember: rules.sortString(),
  nameOrderTag: rules.sortString()
});

const revertMoveToBookParamsValidator = joi.object({
  taskId: joi.number().required()
});

const getTaskSchema = joi.object({
  taskId: joi.number().required()
});

module.exports = {
  getByBookIdsValidator,
  revertMoveToBookParamsValidator,
  getTaskSchema
};
