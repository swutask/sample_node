const {
  rrulestr
} = require('rrule');
const { required } = require('../utils/index');

/**
 * @param stringRrule {string}
 * @return {string[]}
 */
function validateRecurringRule (stringRrule = required()) {
  let rruleSet;

  try {
    rruleSet = rrulestr(stringRrule, {
      forceset: true
    });
  } catch (e) {
    console.log(e);
    throw new Error('Wrong recurring rule format');
  }

  const rruleSetValues = rruleSet
    .valueOf()
    .filter((value) => !value.match(/^DTSTART:/));

  return rruleSetValues.map((rruleSetValue) => {
    const match = rruleSetValue.match(/^EXDATE:(?:\d{8}T\d{6}[TZD](?:,|$))+/g);

    if (match) {
      const dateMatch = rruleSetValue.matchAll(/(\d{8})T\d{6}[TZD]/g);

      return [...dateMatch].reduce((acc, [_, date], index) => {
        if (index !== 0) {
          acc += ',';
        }

        acc += date;

        return acc;
      }, 'EXDATE;VALUE=DATE:');
    }

    return rruleSetValue;
  });
}

module.exports = {
  validateRecurringRule
};
