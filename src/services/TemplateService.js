'use strict';
const models = require('../models');
const { required } = require('../utils');
const { sequelize: { sequelize: seq } } = require('../loaders');
const config = require('../config');
const { s3 } = require('../libs');

const { getNanoSec } = require('../utils');
const path = require('path');
const { Op } = require('sequelize');

class TemplateService {
  static async getTemplates ({
    userId = required(),
    teamId,
    type
  } = {}) {
    const map = {
      all: {
        [Op.or]: [{
          userId: userId
        }, {
          teamId: teamId
        }]
      },
      private: {
        userId: userId,
        teamId: null
      },
      shared: {
        teamId: teamId
      }
    };

    const where = teamId ? map[type] : { userId: userId };

    const templates = await models.template.findAll({
      where: where,
      include: [{
        model: models.templateAttachment,
        where: { isThumbnail: true },
        attributes: ['url']
      },
      {
        model: models.templateOrder,
        attributes: ['order', 'createdAt'],
        where: {
          userId: userId
        },
        required: false
      }],
      order: [
        [models.templateOrder, 'order'],
        [models.templateOrder, 'createdAt'],
        'createdAt']
    });

    return templates;
  }

  static async create ({
    title = required(),
    projectId = required(),
    projectTitle = required(),
    content = required(),
    buffer = required(),
    name = required(),
    userId = required(),
    isShared = required(),
    teamId
  } = {}) {
    const options = {};

    if (teamId && isShared) {
      options.teamId = teamId;
    }

    const template = await models.template.create({
      title: title,
      content: content,
      projectTitle: projectTitle,
      userId: userId,
      ...options
    });

    await models.templateOrder.create({
      templateId: template.id,
      userId: userId,
      order: 9999
    });

    const attachments = await models.attachment.findAll({
      where: {
        userId: userId,
        projectId: projectId
      }
    });

    const key = `${userId}/template/${template.id}`;

    const images = await this._getAndUploadImages({
      key: key,
      userId: userId,
      templateId: template.id,
      attachments: attachments,
      uploadModel: 'templateAttachment'
    });

    const newContent = this._replaceContent({ content, images });

    await template.update({
      content: newContent
    });

    const attachment = await s3.upload({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      mimeType: 'image/png',
      key: `${key}/${name}`,
      body: buffer
    });

    await models.templateAttachment.create({
      userId: userId,
      templateId: template.id,
      isThumbnail: true,
      url: attachment.Location,
      key: `${key}/${name}`
    });

    const result = await models.template.findByPk(template.id, {
      include: [{
        model: models.templateAttachment,
        where: { isThumbnail: true },
        attributes: ['url']
      }]
    });

    return result;
  }

  static async delete ({
    id = required(),
    userId = required()
  } = {}) {
    const count = await models.template.destroy({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!count) {
      throw new Error('template not found');
    }
  }

  static async update ({
    id = required(),
    title = required(),
    isShared = required(),
    teamId,
    userId = required()
  } = {}) {
    const options = { title: title };

    if (teamId) { options.teamId = isShared ? teamId : null; }

    const count = await models.template.update(
      options,
      {
        where: {
          id: id,
          userId: userId
        }
      }
    );

    if (count[0] === 0) throw new Error('template not found');
  }

  static async order ({
    ids = required(),
    userId = required()
  } = {}) {
    return seq.transaction(async t => {
      for (const [index, id] of ids.entries()) {
        const options = {
          templateId: id,
          userId: userId
        };

        const order = await models.templateOrder.findOne({
          where: options,
          transaction: t
        });

        if (!order) {
          await models.templateOrder.create({
            ...options,
            order: index
          }, {
            transaction: t
          });
        } else {
          await models.templateOrder.update(
            { order: index },
            {
              where: options,
              transaction: t
            }
          );
        }
      }
    });
  }

  static async paste ({
    projectId = required(),
    templateId = required(),
    userId = required()
  } = {}) {
    const template = await models.template.findByPk(templateId);
    const project = await models.project.findByPk(projectId);

    if (!project) throw new Error('Page not found');
    if (!template) throw new Error('template not found');

    const key = `${userId}/${project.id}`;

    const attachments = await models.templateAttachment.findAll({
      where: {
        userId: userId,
        isThumbnail: false,
        templateId: template.id
      }
    });

    const images = await this._getAndUploadImages({
      key: key,
      userId: userId,
      projectId: project.id,
      attachments: attachments,
      uploadModel: 'attachment'
    });

    const newContent = this._replaceContent({
      content: template.content,
      images
    });

    await project.update({
      body: newContent,
      title: template.projectTitle
    });

    return { project };
  }

  static _replaceContent ({ content, images }) {
    let str = '';

    const commentRegExp = /(<span comment.*?>)(.*?)(<\/.*?>)(<span content.*?>)(.*?)(<\/.*?>)(<\/.*?>)/g;
    str = content.replace(commentRegExp, '');

    images.forEach(item => {
      const imageIdRegExp = new RegExp(`id="${item.old.id}"`, 'g');
      const imageUrlRegExp = new RegExp(`src="${item.old.url}"`, 'g');

      str = str.replace(imageIdRegExp, `id="${item.new.id}"`);
      str = str.replace(imageUrlRegExp, `src="${item.new.url}"`);
    });

    return str;
  };

  static async _getAndUploadImages ({
    key = required(),
    userId = required(),
    projectId,
    templateId,
    attachments = required(),
    uploadModel = required()
  } = {}) {
    const images = [];

    for (const attachment of attachments) {
      const oldAttach = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: attachment.key
      });

      const name = Date.now() + '_' + getNanoSec() + path.extname(attachment.key);

      const upload = await s3.upload({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        mimeType: oldAttach.ContentType,
        key: `${key}/${name}`,
        body: oldAttach.Body
      });

      const newAttach = await models[uploadModel].create({
        userId: userId,
        projectId: projectId,
        templateId: templateId,
        mimeType: oldAttach.ContentType,
        size: oldAttach.ContentLength,
        url: upload.Location,
        key: `${key}/${name}`
      });

      images.push({
        old: attachment,
        new: newAttach
      });
    }

    return images;
  };
}

module.exports = TemplateService;
