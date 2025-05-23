'use strict';
const redis = require('redis');
const { promisify } = require('util');
const log = require('../log')('redis');
const redisConfig = {
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST
  // password: process.env.REDIS_PASSWORD
};

const client = redis.createClient(redisConfig);
client.on('error', (error) => {
  log.error(error);
});
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const deleteAsync = promisify(client.del).bind(client);
const keys = promisify(client.keys).bind(client);
const exists = promisify(client.exists).bind(client);
const setKey = async (key, value) => {
  await setAsync(key, value, 'EX', 60 * 60 * 24 * 1); // 1 day
};

const get = async (key) => {
  return getAsync(key);
};

const deleteKey = async (key) => {
  await deleteAsync(key);
};

const getJsonByKey = async (key) => {
  const value = await get(key);
  return JSON.parse(value);
};

const setJsonByKey = async (key, value) => {
  value = JSON.stringify(value);
  await setKey(key, value);
};

const deleteByUser = async (userId) => {
  const userKeys = await keys(`${userId}_*`);
  for (const key of userKeys) {
    await deleteKey(key);
  }
};

const deleteByPattern = async (pattern) => {
  const patternKeys = await keys(pattern);
  for (const key of patternKeys) {
    await deleteKey(key);
  }
};

const redisHealth = async _ => {
  return client.set('health', '1');
};

const existsKey = async (key) => {
  return await exists(key);
};

module.exports = {
  setKey,
  get,
  delete: deleteKey,
  getJsonByKey,
  setJsonByKey,
  deleteByUser,
  deleteByPattern,
  redisHealth,
  existsKey,
  getClient: () => redis.createClient(redisConfig)
};
