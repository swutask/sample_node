'use strict';

const AWS = require('aws-sdk');
const { required } = require('../utils');

module.exports = {
  upload: async ({
    accessKeyId = required(),
    secretAccessKey = required(),
    mimeType,
    region = required(),
    bucket = required(),
    body = required(),
    key = required()
  } = {}) => {
    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region
    });

    const result = await s3.upload({
      Bucket: bucket,
      Body: body,
      Key: key,
      ContentType: mimeType,
      ACL: 'public-read'
    }).promise();
    return result;
  },

  /**
   * @param accessKeyId {string}
   * @param secretAccessKey {string}
   * @param region {string}
   * @param bucket {string}
   * @param keys {import('aws-sdk').S3.ObjectIdentifierList}
   * @returns {Promise<S3.DeleteObjectsOutput & {$response: Response<S3.DeleteObjectsOutput, Error & {code: string, message: string, retryable?: boolean, statusCode?: number, time: Date, hostname?: string, region?: string, retryDelay?: number, requestId?: string, extendedRequestId?: string, cfId?: string, originalError?: Error}>}>}
   */
  delete: async ({
    accessKeyId = required(),
    secretAccessKey = required(),
    region = required(),
    bucket = required(),
    keys = required()
  } = {}) => {
    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region
    });

    const result = await s3.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: keys
      }
    }).promise();
    return result;
  },

  getObject: async ({
    accessKeyId = required(),
    secretAccessKey = required(),
    region = required(),
    bucket = required(),
    key = required()
  } = {}) => {
    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region
    });

    const result = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    return result;
  },

  duplicate: async ({
    accessKeyId = required(),
    secretAccessKey = required(),
    copySource = required(),
    region = required(),
    bucket = required(),
    key = required()
  } = {}) => {
    const s3 = new AWS.S3({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region
    });

    const result = await s3.copyObject({
      Bucket: bucket,
      Key: key,
      CopySource: copySource,
      ACL: 'public-read'
    }).promise();

    return result;
  }
};
