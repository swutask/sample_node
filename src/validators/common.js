const joi = require('@hapi/joi');

function shouldNotExist (errorCode = 'any.invalid', errorFlag = true) {
  return joi
    .custom((value, helper) => {
      if (errorFlag) {
        return helper.error(errorCode);
      }

      return value;
    });
}

function numericStringList (allow = []) {
  let regex = /^\d+(,\d+)*$/;

  if (allow.length) {
    const allowedNumbers = allow.join('');
    regex = new RegExp(`^[${allowedNumbers}]+(,[${allowedNumbers}]+)*$`);
  }

  return joi.string().regex(regex);
}

function stringList (values) {
  const regexPart = `(${values.join('|')})`;
  const regex = new RegExp(`^${regexPart}+(,${regexPart}+)*$`);

  return joi.string().regex(regex);
}

function sortString () {
  return joi.string().valid('ASC', 'DESC');
}

module.exports = {
  validators: {
    shouldNotExist
  },
  rules: {
    numericStringList,
    stringList,
    sortString
  }
};
