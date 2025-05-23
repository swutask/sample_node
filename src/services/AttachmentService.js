'use strict';

const { sequelize } = require('../loaders/sequelize');
const { required } = require('../utils');
const config = require('../config');
const { s3 } = require('../libs');
const { Op, QueryTypes } = require('sequelize');
const models = require('../models');
const { getNanoSec } = require('../utils');
const path = require('path');
// const SocketNotifyService = require('./SocketNotifyService');
const { UserRepo } = require('../repos/index');
const AttachmentRepo = require('../repos/AttachmentRepo');
const crypto = require('crypto');
const { elasticsearch } = require('../libs/index');
const ActivityProducerService = require('./ActivityProducerService');
const { CustomError } = require('../errors/CustomError');
const ProjectRepo = require('../repos/ProjectRepo');

const Sequelize = require('sequelize');
const TeamMemberRepo = require('../repos/TeamMemberRepo');

class AttachmentService {
  static async createImage ({
    name = required(),
    size = required(),
    mimeType = required(),
    bookId = null,
    originalname,
    projectId = null,
    body = required(),
    userId = required(),
    teamId = null,
    taskId = null,
    isTaskThumbnail = false,
    showInCard = false,
    showInModal = false
  } = {}) {
    const { name: imageName, ext } = path.parse(originalname);
    const key = this.generateKey(userId, name, ext);

    const upload = await s3.upload({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      mimeType: mimeType,
      key: key,
      body: body
    });

    const options = {
      taskId: taskId,
      projectId: projectId,
      size: size,
      mimeType: mimeType,
      url: upload.Location,
      key: key,
      name: imageName,
      bookId,
      isTaskThumbnail,
      showInCard,
      showInModal
    };

    if (teamId) {
      options.teamId = teamId;
    } else {
      options.userId = userId;
    }

    if (isTaskThumbnail) {
      await models.attachment.destroy({
        where: {
          taskId,
          isTaskThumbnail: true
        }
      });
    }

    const attachment = await models.attachment.create(options);

    const chat = await models.chat.create({
      attachmentId: attachment.id
    });

    const result = await models.attachment.findByPk(attachment.id, {
      include: [{ model: models.chat }]
    });

    if (teamId) {
      const where = {
        teamId,
        projectId: null
      };

      if (bookId) {
        where.bookId = bookId;
      }

      // const members = await models.teamAccess.findAll({
      //   where
      // });

      // const userIds = members.map(m => m.userId);
      // const uniqueUserIds = [...new Set(userIds)];

      // for (const id of uniqueUserIds) {
      //   await models.chatSetting.create({
      //     chatId: chat.id,
      //     userId: id,
      //     mutedAt: null
      //   });

      //   if (id !== userId) {
      //     SocketNotifyService.notify({
      //       userId: id,
      //       name: 'attachment',
      //       payload: {
      //         type: 'create',
      //         value: result.get()
      //       }
      //     });
      //   }
      // }
    } else {
      await models.chatSetting.create({
        chatId: chat.id,
        userId: userId,
        mutedAt: null
      });
    }

    await elasticsearch.updateById({
      id: attachment.id,
      obj: attachment,
      modelName: 'attachment',
      upsert: true
    });

    if (taskId) {
      if (isTaskThumbnail) {
        await ActivityProducerService.sendMessage({
          from: {
            attachmentCoverImageId: null
          },
          to: {
            id: taskId,
            attachmentCoverImageId: attachment.id
          },
          creatorId: userId,
          type: 'task',
          entity: 'task'
        });
      } else {
        await ActivityProducerService.sendMessage({
          from: {
            additionalInfo: null
          },
          to: {
            id: taskId,
            additionalInfo: 'NEW_ATTACHMENT'
          },
          creatorId: userId,
          type: 'task',
          entity: 'task'
        });
      }
    } else if (bookId) {
      await ActivityProducerService.sendMessage({
        from: null,
        to: {
          id: attachment.id
        },
        creatorId: userId,
        type: 'book',
        entity: 'attachment'
      });
    }

    return result.get();
  }

  static async duplicate ({
    name = required(),
    size = required(),
    mimeType = required(),
    key = required(),
    bookId = null,
    projectId = null,
    userId = required(),
    teamId = null,
    taskId = null,
    showInModal = false,
    showInCard = false,
    isTaskThumbnail = false
  } = {}) {
    const newKey = this.generateKey(userId, name, path.extname(key));

    await s3.duplicate({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      key: newKey,
      copySource: encodeURI(`/${config.s3.bucket}/${key}`)
    });

    const url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${newKey}`;

    const options = {
      taskId: taskId,
      projectId: projectId,
      size: size,
      mimeType: mimeType,
      url,
      key: newKey,
      name: name,
      bookId,
      showInModal,
      showInCard,
      isTaskThumbnail
    };

    if (teamId) {
      options.teamId = teamId;
    } else {
      options.userId = userId;
    }

    const attachment = await models.attachment.create(options);

    const chat = await models.chat.create({
      attachmentId: attachment.id
    });

    const result = await models.attachment.findByPk(attachment.id, {
      include: [{ model: models.chat }]
    });

    if (teamId) {
      const where = {
        teamId,
        projectId: null
      };

      if (bookId) {
        where.bookId = bookId;
      }

      // const members = await models.teamAccess.findAll({
      //   where
      // });

      // const userIds = members.map(m => m.userId);
      // const uniqueUserIds = [...new Set(userIds)];

      // for (const id of uniqueUserIds) {
      //   await models.chatSetting.create({
      //     chatId: chat.id,
      //     userId: id,
      //     mutedAt: null
      //   });

      //   if (id !== userId) {
      //     SocketNotifyService.notify({
      //       userId: id,
      //       name: 'attachment',
      //       payload: {
      //         type: 'create',
      //         value: result.get()
      //       }
      //     });
      //   }
      // }
    } else {
      await models.chatSetting.create({
        chatId: chat.id,
        userId: userId,
        mutedAt: null
      });
    }

    await elasticsearch.updateById({
      id: attachment.id,
      obj: attachment,
      modelName: 'attachment',
      upsert: true
    });

    return result.get();
  }

  /**
   * @param userId {number}
   * @param fileName {string}
   * @param type {string} .pmg .jpeg ...
   * @return {string}
   */
  static generateKey (
    userId = required(),
    fileName = required(),
    type = required()
  ) {
    const name = Date.now() + '_' + getNanoSec() + fileName;
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}_${name}`)
      .digest('hex');

    return hash + type;
  }

  /**
   * @param userData {{
   *   userId: number | undefined,
   *   teamId: number | undefined
   * }}
   * @param relatedIds {{
   *  bookId: number | undefined,
   *  projectId: number | undefined,
   *  taskId: number | undefined,
   * }}
   * @param filesData {{
   *  mimeType: string,
   *  size: number,
   *  name: string,
   *  originalname: string | null,
   *  order: number
   * }[]}
   * @return {Promise<{
   *   status: boolean,
   *   data: Object
   * }[]>}
   */
  static async createManyFiles (
    {
      userId,
      teamId
    },
    {
      projectId,
      bookId,
      taskId
    },
    filesData = required()
  ) {
    const createFilesData = filesData.map((fileData) => {
      const { name, ext } = path.parse(fileData.name);
      const key = this.generateKey(userId, fileData.name, ext);
      const options = {
        taskId,
        projectId,
        key,
        name,
        size: fileData.size,
        mimeType: fileData.mimeType,
        order: fileData.order,
        bookId
      };

      if (teamId) {
        options.teamId = teamId;
      } else {
        options.userId = userId;
      }

      return options;
    });

    const createdAttachmentModels = await models.attachment.bulkCreate(createFilesData, {
      returning: true
    });
    const createdAttachmentIds = createdAttachmentModels.map(({ id }) => id);
    const createdAttachments = createdAttachmentModels.map((attachment) => attachment.get());

    const createChatsData = createdAttachmentIds.map((id) => ({
      attachmentId: id
    }));

    const chats = await models.chat.bulkCreate(createChatsData, {
      returning: ['id']
    });

    let uniqueUserIds = [];
    if (bookId) {
      uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId, bookId);
    } else {
      // TODO: get all team users by team id
    }

    const createChatSettingsData = uniqueUserIds.map((userId) => ({
      ...chats.map(({ id }) => ({
        chatId: id,
        userId: userId,
        mutedAt: null
      }))
    }));

    await models.chatSetting.bulkCreate(createChatSettingsData);

    const createdAttachmentsWithChats = await models.attachment.findAll({
      where: {
        id: createdAttachmentIds
      },
      include: [{ model: models.chat }]
    });

    await elasticsearch.bulkCreate({
      modelName: 'attachment',
      items: createdAttachments
    });

    return createdAttachmentsWithChats.map(createdAttachment => createdAttachment.get());
  }

  static async getFile ({
    id = required(),
    teamId = null
  }) {
    return AttachmentRepo.getOneByIdWithRelatedIds(id, {
      teamId
    });
  }

  static async getShareFile ({
    id = required(),
    shareId = required(),
    projectId = required()
  }) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: projectId,
        isActive: true
      },
      include: [{
        model: models.project,
        required: true,
        attributes: ['id']
      }]
    });

    if (!shareLink) throw new Error('Share link not found');

    // temporary hide the projectId because some attachments were
    // mistakenly uploaded without it and returns an error
    return AttachmentRepo.getOneByIdWithRelatedIds(id, {
      // projectId
    });
  }

  /**
   * @param attachmentId {number}
   * @param teamId {number}
   * @param userId {number}
   * @param keyForGettingExternalVersionId {string=}
   * @param updateData {*}
   * @returns {Promise<void>}
   */
  static async update ({
    attachmentId,
    teamId,
    userId,
    keyForGettingExternalVersionId,
    updateData
  }) {
    const attachmentBeforeUpdate = await AttachmentRepo.getById(attachmentId);

    if (!attachmentBeforeUpdate) {
      throw new CustomError('Attachment was not found');
    }

    if (keyForGettingExternalVersionId) {
      const file = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: keyForGettingExternalVersionId
      });

      updateData.externalVersion = file.VersionId;
    }

    const updatedAttachment = await AttachmentRepo.updateByIdAndTeamId(
      attachmentId,
      teamId,
      updateData
    );

    if (!updatedAttachment) {
      throw new CustomError('Attachment was not updated');
    }

    await ActivityProducerService.sendMessage({
      from: attachmentBeforeUpdate,
      to: updatedAttachment,
      creatorId: userId,
      entity: 'attachment',
      type: 'book'
    });

    // const uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(teamId, updatedAttachment.bookId);

    // if (!uniqueUserIds) {
    //   return;
    // }

    // for (const id of uniqueUserIds) {
    //   if (id === userId) {
    //     continue;
    //   }

    //   SocketNotifyService.notify({
    //     userId: id,
    //     name: 'attachment',
    //     payload: {
    //       type: 'update',
    //       value: updatedAttachment
    //     }
    //   });
    // }
  }

  static async updateProjectShared ({
    projectId,
    attachmentId,
    shareId,
    keyForGettingExternalVersionId,
    updateData
  }) {
    if (keyForGettingExternalVersionId) {
      const file = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: keyForGettingExternalVersionId
      });

      updateData.externalVersion = file.VersionId;
    }

    const { userId, teamId } = await ProjectRepo.getUserIdFromSharedProject(projectId, shareId);

    if (!teamId) {
      throw new CustomError('Share creator doesn\'t related with team', 403);
    }

    await this.update({
      attachmentId,
      teamId,
      userId,
      updateData
    });
  }

  /**
   * @param attachmentIds {number[]}
   * @returns {Promise<void>}
   */
  static async updateOrders ({
    attachmentIds
  }) {
    const replacements = attachmentIds.reduce((acc, attachmentId, index) => {
      acc.ids.push(attachmentId);
      acc.orders.push(index);

      return acc;
    }, {
      ids: [],
      orders: []
    });

    await sequelize.transaction(async (transaction) => {
      const [_, updatedCount] = await sequelize.query(`
          UPDATE attachments
          SET "order" = data."order"
          FROM (SELECT unnest(array [:ids])    as id,
                       unnest(array [:orders]) as "order") as data
          WHERE attachments.id = data.id
        `, {
        type: QueryTypes.UPDATE,
        replacements,
        transaction
      });

      if (updatedCount !== attachmentIds.length) {
        throw new CustomError('Attachments were not updated');
      }
    });
  }

  static async updateFile ({
    teamId = null,
    id = required(),
    url,
    userId = required(),
    keyForGettingExternalVersionId,
    bookId = null,
    projectId = null,
    taskId = null
  }) {
    let externalVersion;

    if (keyForGettingExternalVersionId) {
      const file = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: keyForGettingExternalVersionId
      });

      externalVersion = file.VersionId;
    }

    const attachment = await models.attachment.findOne({
      where: {
        id: id,
        teamId: teamId,
        userId: teamId ? null : userId
      },
      include: [{ model: models.chat }]
    });

    if (!attachment) throw new Error('File not found');

    await attachment.update({
      url,
      externalVersion,
      projectId,
      taskId
    });

    if (teamId) {
      const where = {
        teamId,
        projectId: null
      };

      if (bookId) {
        where.bookId = bookId;
      }

      // const members = await models.teamAccess.findAll({
      //   where
      // });
      // TODO rework
      // const userIds = members.map(m => m.userId);
      // const uniqueUserIds = [...new Set(userIds)];

      // for (const id of uniqueUserIds) {
      //   if (id !== userId) {
      //     SocketNotifyService.notify({
      //       userId: id,
      //       name: 'attachment',
      //       payload: {
      //         type: 'create',
      //         value: attachment.get()
      //       }
      //     });
      //   }
      // }
    }

    return attachment;
  }

  static async updateShareFile ({
    id = required(),
    url,
    keyForGettingExternalVersionId,
    shareId = required(),
    projectId = required()
  }) {
    let externalVersion;

    if (keyForGettingExternalVersionId) {
      const file = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: keyForGettingExternalVersionId
      });

      externalVersion = file.VersionId;
    }

    return sequelize.sequelize.transaction(async t => {
      const shareLink = await models.shareLink.findOne({
        where: {
          id: shareId,
          projectId: projectId,
          isActive: true
        },
        include: [{
          model: models.project,
          required: true,
          attributes: ['id']
        }],
        transaction: t
      });

      if (!shareLink) throw new Error('Share link not found');

      const count = await models.attachment.update({
        url: url,
        externalVersion
      },
      {
        where: {
          id: id,
          projectId: projectId
        },
        transaction: t
      });

      if (count[0] === 0) throw new Error('File not found');
    });
  }

  static async deleteTaskThumbnail ({
    id = required(),
    userId = required(),
    teamId = null,
    taskId = required()
  } = {}) {
    const count = await models.attachment.destroy({
      where: {
        id: id,
        userId: teamId ? null : userId,
        teamId: teamId,
        taskId: taskId
      }
    });

    if (count) {
      await ActivityProducerService.sendMessage({
        from: {
          id: taskId,
          attachmentCoverImageId: id
        },
        to: {
          attachmentCoverImageId: null
        },
        creatorId: userId,
        type: 'task',
        entity: 'task'
      });
    }
  }

  /**
   * @param fileIds {number[]}}
   * @param permanent {boolean}}
   * @return {Promise<{
   *   id: number,
   *   status: boolean
   * }[]>}
   */
  static async deleteMany ({
    fileIds = required(),
    permanent = false
  }) {
    const deletedAttachmentIdsAndKeys = await AttachmentRepo.deleteAllByIdsReturn(fileIds, permanent);
    const { ids, keys } = deletedAttachmentIdsAndKeys.reduce((acc, attachment) => {
      acc.ids.push(attachment.id);

      if (attachment.key) {
        acc.keys.push({
          Key: attachment.key,
          VersionId: attachment.external_version
        });
      }

      return acc;
    }, {
      ids: [],
      keys: []
    });

    if (!deletedAttachmentIdsAndKeys) {
      throw new Error('Neither files was deleted');
    }

    await s3.delete({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: config.s3.region,
      bucket: config.s3.bucket,
      keys
    });

    return fileIds.map((idToDelete) => ({
      id: idToDelete,
      status: ids.includes(idToDelete)
    }));
  }

  static async deleteOrRestore ({
    attachmentIds = required(),
    userId = required(),
    projectId = null,
    taskId = null,
    teamId = null
  } = {}) {
    const deletedAttachments = await models.attachment.findAll({
      where: {
        userId: teamId ? null : userId,
        projectId: projectId,
        teamId: teamId,
        taskId: taskId,
        isTaskThumbnail: false,
        deletedAt: { [Op.ne]: null }
      },
      paranoid: false
    });

    const existingAttachments = await models.attachment.findAll({
      where: {
        userId: teamId ? null : userId,
        projectId: projectId,
        teamId: teamId,
        isTaskThumbnail: false,
        taskId: taskId
      }
    });

    // delete
    if (existingAttachments.map(a => a.id)) {
      const ids = existingAttachments.filter(a => !attachmentIds.includes(a.id)).map(i => i.id);

      await models.attachment.destroy({
        where: {
          userId: teamId ? null : userId,
          projectId: projectId,
          teamId: teamId,
          taskId: taskId,
          id: ids
        }
      });
    }

    // restore
    if (attachmentIds.length > 0 && deletedAttachments.map(a => a.id).some(item => attachmentIds.includes(item))) {
      await models.attachment.update(
        {
          deletedAt: null
        },
        {
          where: {
            userId: teamId ? null : userId,
            projectId: projectId,
            id: attachmentIds,
            taskId: taskId,
            teamId: teamId
          },
          paranoid: false
        }
      );
    }
  }

  static async getAll ({
    userId = required(),
    bookIds = required(),
    teamId = null,
    search = '',
    limit
  } = {}) {
    const books = await models.book.findAll({
      where: {
        id: bookIds
      }
    });

    const where = {
      bookId: books.map(item => item.id),
      userId: teamId ? null : userId,
      teamId,
      originalId: null
    };

    if (search?.trim() !== '') where.name = { [Op.iLike]: '%' + search + '%' }; // TODO: change this for performance improvements

    const count = await models.attachment.count({
      where,
      limit
    });
    const attachmentModels = await models.attachment.findAll({
      where,
      attributes: {
        include: [[
          Sequelize.literal(`
            (SELECT count(*)
              FROM messages
                       INNER JOIN chats c ON c.id = messages.chat_id
                       INNER JOIN attachments a ON c.attachment_id = a.id
                  AND a.original_id = "attachment".id
                  AND a.version = (SELECT max(version) FROM attachments as v WHERE v.original_id = "attachment".id)
              WHERE messages.deleted_at IS NULL)
           `),
          'subversionMessageCount'
        ]]
      },
      include: [
        {
          model: models.chat,
          attributes: {
            include: [[
              Sequelize.literal(`
            (SELECT COUNT(*)
              FROM messages
              WHERE messages.chat_id = "chat"."id"
              AND messages.deleted_at IS NULL)
           `),
              'messageCount'
            ]]
          }
        },
        {
          model: models.attachment,
          as: 'subversion',
          include: {
            model: models.chat
          }
        }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });

    return {
      files: attachmentModels.map(a => a.get()),
      count
    };
  }

  static async updateName ({
    id = required(),
    name = required(),
    userId = required(),
    teamId = null
  } = {}) {
    const count = await models.attachment.update({
      name
    },
    {
      where: {
        id: id,
        userId: teamId ? null : userId,
        teamId
      }
    });

    // if (teamId) {
    //   const members = await models.teamAccess.findAll({
    //     where: {
    //       teamId,
    //       projectId: null
    //     }
    //   });

    //   const userIds = members.map(m => m.userId);
    //   const uniqueUserIds = [...new Set(userIds)];

    //   for (const user of uniqueUserIds) {
    //     if (user !== userId) {
    //       SocketNotifyService.notify({
    //         userId: user,
    //         name: 'attachment',
    //         payload: {
    //           type: 'updateName',
    //           value: {
    //             id,
    //             name
    //           }
    //         }
    //       });
    //     }
    //   }
    // }

    if (count === 0) throw new Error('Notification not found');
  }

  /**
   * @param size {number}
   * @param originalId {number}
   * @param externalVersion {string}
   * @param name {string}
   * @param userId {number}
   * @returns {Promise<*>}
   */
  static async addVersion ({
    size,
    originalId,
    name,
    userId
  }) {
    const originalAttachment = await AttachmentRepo.getById(originalId);

    if (!originalAttachment) {
      throw new CustomError('Original attachment was not found');
    }

    const lastVersion = await AttachmentRepo.getLastVersionByOriginalId(originalId);

    if (!lastVersion) {
      throw new CustomError('Can\'t get last version');
    }

    if (lastVersion === 1) {
      const originalObj = await s3.getObject({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: config.s3.region,
        bucket: config.s3.bucket,
        key: originalAttachment.key
      });

      if (originalObj.VersionId) {
        await AttachmentRepo.updateById(originalAttachment.id, {
          externalVersion: originalObj.VersionId
        });
      }
    }

    const version = lastVersion + 1;
    const createdAttachment = await AttachmentRepo.create({
      key: originalAttachment.key,
      mimeType: originalAttachment.mimeType,
      bookId: originalAttachment.bookId,
      teamId: originalAttachment.teamId,
      name,
      version,
      url: null,
      originalId,
      size
    });

    const chat = await models.chat.create({
      attachmentId: createdAttachment.id
    }, {
      returning: ['id']
    });

    let uniqueUserIds = null;

    if (originalAttachment.bookId || originalAttachment.projectId) {
      uniqueUserIds = await UserRepo.getAllUniqIdsFromTeamAccess(
        originalAttachment.teamId,
        originalAttachment.bookId,
        originalAttachment.projectId
      );
    } else {
      uniqueUserIds = await TeamMemberRepo.getAllUserIdsByTeamId(originalAttachment.teamId);
    }

    if (uniqueUserIds) {
      const createChatSettingsData = uniqueUserIds.map((userId) => ({
        chatId: chat.id,
        userId: userId,
        mutedAt: null
      }));

      await models.chatSetting.bulkCreate(createChatSettingsData);
    }

    createdAttachment.chat = chat;
    createdAttachment.original = {
      url: originalAttachment.url
    };

    await ActivityProducerService.sendMessage({
      from: null,
      to: {
        id: createdAttachment.id,
        originalId
      },
      creatorId: userId,
      type: 'book',
      entity: 'attachment'
    });

    return createdAttachment;
  }
}

module.exports = AttachmentService;
