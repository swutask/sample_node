'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');

const { TiptapTransformer } = require('@hocuspocus/transformer');
const { generateJSON, generateHTML } = require('@tiptap/html');
const Y = require('yjs');
const { depthPageExtensions, pageExtensions } = require('../libs/tiptap/extensions');

const models = require('../models');
const { required } = require('../utils');

const CheckService = require('./CheckService');
const ProjectService = require('./ProjectService');
const AttachmentService = require('./AttachmentService');
const { getAttachments } = require('../core/helpers');
const TeamAccessRepo = require('../repos/TeamAccessRepo');
const TaskService = require('./TaskService');

class CollaborationServiceV2 {
  /**
    * @param id {number}
    * @param userId {number}
    * @param teamId {number}
    * @param bookId {number}
    * @return {Promise<*[]>}
  */
  static async getJWTForTask (
    id = required(),
    bookId = required(),
    userId = required(),
    teamId
  ) {
    try {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: true
      });

      let userOrTeamId = { userId };
      if (teamId) userOrTeamId = { teamId };

      const task = await models.task.findOne({
        where: {
          id,
          bookId,
          ...userOrTeamId
        }
      });

      if (!task) throw new Error('Task not found');

      const name = task.collaborationKey || `complex-book-${task.bookId}-task-${task.id}`;
      // Check if document exists
      let doc = await this._getDocument(name);

      // Create a new document if document doesn't exist
      if (!doc) {
        const prosemirrorJSON = generateJSON(task.additionalInfo?.trim() || '', depthPageExtensions);

        const ydoc = TiptapTransformer.toYdoc(prosemirrorJSON, 'default', depthPageExtensions);

        const encode = Y.encodeStateAsUpdate(ydoc);

        doc = await this._createDocument(name, encode);
      }

      const jwt = await this._generateJWT(name);

      return { jwt, name, data: doc.data };
    } catch (error) {
      throw new Error(error);
    }
  }

  static async getJWTForProject ({
    id = required(),
    bookId = null,
    userId = null,
    teamId = null,
    shareId = null
  } = {}) {
    try {
      let project;

      if (userId) {
        await CheckService.checkUserBook({
          bookIds: [bookId],
          userId,
          teamId,
          hasClientAccess: true
        });

        project = await ProjectService.getById({
          id
        });
      }

      if (shareId) {
        project = await ProjectService.getShared({
          projectId: id,
          shareId
        });
      }

      if (!project) throw new Error('Project not found');

      const name = `complex-book-${project.bookId}-project-${project.id}`;
      // Check if document exists
      let doc = await this._getDocument(name);

      // Create a new document if document doesn't exist
      if (!doc) {
        let state = project.state ? Buffer.from(project.state, 'base64') : null;

        if (!state) {
          const prosemirrorJSON = generateJSON(project.body?.trim() || '', pageExtensions);

          const ydoc = TiptapTransformer.toYdoc(prosemirrorJSON, 'default', pageExtensions);

          state = Y.encodeStateAsUpdate(ydoc);
        }

        doc = await this._createDocument(name, state);
      }

      const jwt = await this._generateJWT(name);

      return { jwt, name, data: doc.data };
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
    * @param name {string}
    * @return {Promise<*[]>}
  */
  static async _getDocument (name) {
    try {
      const doc = await axios.get(`https://${process.env.TIPTAP_COLLABORATION_APP_ID}.collab.tiptap.cloud/api/documents/${name}`, {
        headers: {
          Authorization: process.env.TIPTAP_COLLABORATION_API_SECRET
        }
      });

      return doc;
    } catch (error) {
      if (error.message === 'Request failed with status code 404') {
        return null;
      }

      throw new Error(error);
    }
  }

  /**
   * @param name {string}
   * @param encode {binary}
    * @return {Promise<*[]>}
  */
  static async _createDocument (name, encode) {
    try {
      return axios.post(`https://${process.env.TIPTAP_COLLABORATION_APP_ID}.collab.tiptap.cloud/api/documents/${name}`,
        encode,
        {
          headers: {
            Authorization: process.env.TIPTAP_COLLABORATION_API_SECRET
          }
        }
      );
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
    * @param name {string}
    * @return {Promise<*[]>}
  */
  static async _generateJWT (
    name = required()
  ) {
    const data = {
      // Use this list to limit the number of documents that can be accessed by this client.
      // An empty array means no access at all.
      // Not sending this property means access to all documents.
      // We are supporting a wildcard at the end of the string (only there).
      allowedDocumentNames: [name]
    };

    // This JWT should be sent in the `token` field of the provider. Never expose 'your_secret' to a frontend!
    return jwt.sign(data, process.env.TIPTAP_COLLABORATION_APP_SECRET);
  }

  /**
    * @param id {number}
    * @param userId {number}
    * @param teamId {number}
    * @param bookId {number}
    * @return {Promise<*[]>}
  */
  static async deleteDocument (
    id = required(),
    bookId = required(),
    type = required(),
    userId = required(),
    teamId
  ) {
    try {
      await CheckService.checkUserBook({
        bookIds: [bookId],
        userId,
        teamId,
        hasClientAccess: false
      });

      const name = `book-${bookId}-${type}-${id}`;

      const data = await axios.delete(`https://${process.env.TIPTAP_COLLABORATION_APP_ID}.collab.tiptap.cloud/api/documents/${name}`, {
        headers: {
          Authorization: process.env.TIPTAP_COLLABORATION_API_SECRET
        }
      });
      console.log(data);

      return data;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
    * @param appName {string} // name of your app
    * @param name {string} // name of the document
    * @param time {Date} // current time as ISOString (new Date()).toISOString())
    * @param tiptapJson {any} // JSON output from Tiptap (see https://tiptap.dev/guide/output#option-1-json): TiptapTransformer.fromYdoc()
    * @param clientsCount {number} // number of currently connected clients
  */

  static async parseWebhook (data) {
    try {
      if (data.appName.toLowerCase() === process.env.TIPTAP_COLLABORATION_APP_ID.toLowerCase()) {
        const [_, bookId, type, id] = data.name.split('-');

        if (type === 'task' && bookId && id) {
          await this._saveTask(id, bookId, data.tiptapJson.default);
        }

        if (type === 'project' && bookId && id) {
          await this._saveProject(id, bookId, data.tiptapJson.default);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
    * @param id {number}
    * @param bookId {number}
    * @param json {any}
    * @return {Promise<*[]>}
  */
  static async _saveTask (id, bookId, json) {
    const { userId, teamId } = await TeamAccessRepo.getTeamIdAndUserIdByBookId(bookId);

    const additionalInfo = generateHTML(json, depthPageExtensions);

    const attachmentIds = getAttachments({ json });

    await AttachmentService.deleteOrRestore({
      taskId: id,
      userId,
      teamId,
      attachmentIds
    });

    await TaskService.update({
      id,
      userId,
      teamId,
      bookId,
      additionalInfo
    });
  }

  /**
    * @param id {number}
    * @param bookId {number}
    * @param json {any}
    * @return {Promise<*[]>}
  */
  static async _saveProject (id, bookId, json) {
    const { userId, teamId } = await TeamAccessRepo.getTeamIdAndUserIdByBookId(bookId);

    const body = generateHTML(json, pageExtensions);

    const ydoc = TiptapTransformer.toYdoc(json, 'default', pageExtensions);

    const state = Y.encodeStateAsUpdate(ydoc);

    const attachmentIds = getAttachments({ json });

    await AttachmentService.deleteOrRestore({
      projectId: id,
      userId,
      teamId,
      attachmentIds
    });

    await ProjectService.update({
      id,
      bookId,
      userId,
      teamId,
      state: Buffer.from(state).toString('base64'),
      body
    });
  }
}

module.exports = CollaborationServiceV2;
