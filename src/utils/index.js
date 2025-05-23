'use strict';

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * @param value {string}
 * @returns {string}
 */
function removeHtmlTagsFromString (value) {
  const formattedString = value.replace(/(<[^>\n\t]+>)|([\n\t])/gi, ' ');

  return formattedString.replace(/\s+/g, ' ').replace('&amp;', '&').replace('&nbsp;', ' ').trim();
}

module.exports = {
  dotEnv: _ => {
    dotenv.config({
      path: path.join(__dirname,
        '..',
        '..',
        '.env.' + process.env.NODE_ENV)
    });
  },
  getFilesInDirSync: (dir, ext, exludes = []) => {
    return fs.readdirSync(dir)
      .filter(file => file.endsWith(ext) && !exludes.includes(file))
      .map(file => path.join(dir, file));
  },
  throwErrorWithCode: (message, code) => {
    code = code ?? 0;
    const error = new Error(message);
    error.code = code;
    throw error;
  },
  getNanoSec: _ => {
    var hrTime = process.hrtime();
    return hrTime[0] * 1000000000 + hrTime[1];
  },
  required: _ => { throw new Error('Parameter is required'); },
  /**
   * @template T
   * @param obj {T}
   * @param allowNull {boolean}
   * @param allowFalsy {boolean}
   * @param allowEmptyCondition {boolean}
   * @return {Partial<T | null>}
   */
  generateWhereCondition: (obj, { allowNull = true, allowFalsy = true, allowEmptyCondition = true } = {}) => {
    const result = Object.entries(obj).reduce((accumulator, [key, value]) => {
      if (
        value === undefined ||
        (!allowNull && value === null) ||
        (value !== null && !allowFalsy && !value) ||
        (value instanceof Array && !value.length)
      ) {
        return accumulator;
      }

      accumulator[key] = value;

      return accumulator;
    }, {});

    if (!allowEmptyCondition && !Object.values(result).length) {
      throw new Error('Empty where condition');
    }

    if (allowEmptyCondition && !Object.values(result).length) {
      return null;
    }

    return result;
  },

  /**
   * @param dataObject {Object}
   * @param allowedFields= {string[]}
   * @return {{}}
   */
  removeHtmlTagsFromObject: (dataObject, allowedFields) => {
    const formattedObj = {};

    Object.entries(dataObject).forEach(([key, value]) => {
      if (allowedFields?.length && !allowedFields.includes(key)) {
        return;
      }

      if (typeof value !== 'string') {
        formattedObj[key] = value;

        return;
      }

      formattedObj[key] = removeHtmlTagsFromString(value);
    });

    return formattedObj;
  },
  removeHtmlTagsFromString,
  /**
   * @param teamName {string}
   * @param url {string}
   * @returns {string}
   */
  generateFELink: ({
    teamLink,
    url
  }) => `${config.proto}://${config.frontendDomain}/${teamLink}${url}`,

  /**
   * @param callbackFunction
   * @param defaultReturn=? {*}
   * @returns {(function(...[*]): Promise<void>)|*}
   */
  catchAndLogError: (callbackFunction, defaultReturn) => async function (...args) {
    try {
      return await callbackFunction(...args);
    } catch (e) {
      console.log(e);

      return defaultReturn;
    }
  }
};
