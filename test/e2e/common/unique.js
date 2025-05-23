const crypto = require('crypto');

/**
 * @param str {string}
 * @return {string}
 */
function unique (str) {
  const uuid = crypto.randomUUID();
  const hash = crypto
    .createHash('MD5')
    .update(uuid)
    .digest('base64url');

  return `${hash}_${str}`;
}

module.exports = {
  unique
};
