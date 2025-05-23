'use strict';

const crypto = require('crypto');

const encode = (secret, str) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(str);
  return hmac.digest('hex').toLowerCase();
};

const isValid = (secret, encoded, str) => {
  const strEncoded = encode(secret, str);
  return encoded.toLowerCase() === strEncoded;
};

module.exports = {
  encode: encode,
  isValid: isValid
};
