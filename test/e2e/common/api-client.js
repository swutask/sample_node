const axios = require('axios');
const { config } = require('dotenv');
const { join } = require('path');
config({
  path: join(
    __dirname,
    '..', '..', '..',
    '.env.e2e'
  )
});

function makeClient ({
  host = 'api',
  port = process.env.PORT,
  https = false,
  prefix = '/api',
  customHeaders,
  accessToken
} = {}) {
  const protocol = https ? 'https' : 'http';
  const baseURL = `${protocol}://${host}:${port}${prefix}`;
  const headers = customHeaders;

  if (accessToken) {
    headers.auth = accessToken;
  }

  return axios.create({
    baseURL,
    headers,
    validateStatus: () => true
  });
}

module.exports = {
  makeClient,
  apiClient: makeClient({
    host: process.env.HOST === '0.0.0.0'
      ? 'api'
      : process.env.HOST,
    port: process.env.PORT
  })
};
