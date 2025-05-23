const models = require('../models/index');
const { sequelize } = require('../loaders/sequelize');
const {
  QueryTypes,
  Op
} = require('sequelize');
const { required } = require('../utils/index');
const { generateWhereCondition } = require('../utils/index');
const Sequelize = require('sequelize');

class AttachmentRepo {
  /**
   * @param ids {number[]}
   * @param permanent {boolean}
   * @return {{
   *   id: number,
   *   key: string
   * }[] | null}
   */
  static async deleteAllByIdsReturn (ids, permanent) {
    let deletedAttachments;

    if (permanent) {
      deletedAttachments = await sequelize.query(`
        DELETE
        FROM attachments
        WHERE id IN (:ids)
        RETURNING *
    `, {
        type: QueryTypes.DELETE,
        replacements: { ids },
        model: models.attachment,
        mapToModel: true
      });
    } else {
      deletedAttachments = await models.attachment.destroy({
        where: {
          id: ids
        },
        paranoid: false,
        returning: ['*']
      });
    }

    return deletedAttachments;
  }

  /**
   * @param messageId {number}
   * @param transaction {any | null}
   * @return {Promise<string[] | null>}
   */
  static async permanentDeleteByMessageIdsReturnKeys (messageId = required(), transaction = null) {
    const deletedAttachments = await sequelize.query(`
        DELETE
        FROM attachments
        WHERE attachments.message_id = :messageId
        RETURNING key
    `, {
      type: QueryTypes.DELETE,
      replacements: { messageId },
      transaction
    });

    if (!deletedAttachments.length) {
      return null;
    }

    return deletedAttachments.map((deletedAttachment) => deletedAttachment.key);
  }

  /**
   * @param ids {number[]}
   * @return {Promise<number[] | null>}
   */
  static async getAllIdsByIdWithChat (ids = required()) {
    const attachments = await models.attachment.findAll({
      where: {
        id: ids
      },
      attributes: ['id'],
      include: {
        model: models.chat,
        attributes: [],
        required: true
      }
    });

    if (!attachments.length) {
      return null;
    }

    return attachments.map(attachment => attachment.id);
  }

  /**
   * @param ids {number}
   * @return {Promise<any[]>}
   */
  static async getAllByIds (ids = required()) {
    const attachments = await models.attachment.findAll({
      where: {
        id: ids
      },
      include: {
        model: models.chat
      }
    });

    if (!attachments.length) {
      return [];
    }

    return attachments.map(attachment => attachment.get());
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async getById (id) {
    const attachment = await models.attachment.findOne({
      where: {
        id
      }
    });

    if (!attachment) {
      return null;
    }

    return attachment.get();
  }

  /**
   * @param id {number}
   * @param relatedIds {{
   *   projectId: number,
   *   taskId: number
   * }}
   * @return {Promise<any[]>}
   */
  static async getOneByIdWithRelatedIds (id = required(), relatedIds = {}) {
    const relatedId = generateWhereCondition(relatedIds, { allowNull: false });

    const attachment = await models.attachment.findOne({
      where: {
        id: id,
        ...relatedId
      },
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
      ]
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    return attachment.get();
  }

  /**
   * @param id {number}
   * @param chatId {number}
   * @returns {Promise<*|null>}
   */
  static async getByIdAndChatId (id, chatId) {
    const attachment = await models.attachment.findOne({
      where: {
        id
      },
      include: {
        model: models.chat,
        attributes: ['id'],
        where: {
          id: chatId
        },
        required: true
      }
    });

    if (!attachment) {
      return null;
    }

    return attachment.get();
  }

  /**
   * @param id {number}
   * @param teamId {number}
   * @param updateData {*}
   * @returns {Promise<null|*>}
   */
  static async updateByIdAndTeamId (id, teamId, updateData) {
    const [affectedCount, updatedAttachments] = await models.attachment.update(updateData, {
      where: {
        id,
        teamId
      },
      returning: true
    });

    if (!affectedCount) {
      return null;
    }

    const [updatedAttachment] = updatedAttachments;

    return updatedAttachment.get();
  }

  /**
   * @param id {number}
   * @param updateData {*}
   * @returns {Promise<boolean>}
   */
  static async updateById (id, updateData) {
    const [affectedCount] = await models.attachment.update(updateData, {
      where: {
        id
      }
    });

    return Boolean(affectedCount);
  }

  /**
   * @param createData {*}
   * @returns {Promise<any>}
   */
  static async create (createData) {
    const createdAttachment = await models.attachment.create(createData);

    return createdAttachment.get();
  }

  /**
   * @param originalId {number}
   * @returns {Promise<number|null>}
   */
  static async getLastVersionByOriginalId (originalId) {
    const attachment = await models.attachment.findOne({
      where: {
        [Op.or]: [
          { originalId },
          { id: originalId }
        ]
      },
      attributes: ['version'],
      order: [['version', 'DESC']]
    });

    if (!attachment) {
      return null;
    }

    return attachment.version;
  }
}

module.exports = AttachmentRepo;
