'use strict';

const models = require('../models');
const { Op } = require('sequelize');
const { required } = require('../utils');
const { sendgrid } = require('../libs');
const config = require('../config');
const { sequelize: { sequelize: seq } } = require('../loaders');
const pdf = require('html-pdf');
const CloudConvert = require('cloudconvert');
const { elasticsearch } = require('../libs');
const ProjectRepo = require('../repos/ProjectRepo');
const ActivityProducerService = require('./ActivityProducerService');

class ProjectService {
  static async getProject ({
    id = required(),
    userId = required(),
    teamId
  } = {}) {
    let project;

    if (teamId) {
      project = await ProjectRepo.getByTeamAccessThrowBook(id, teamId, userId);
    } else {
      project = await ProjectRepo.getByIdAndUserId(id, userId);
    }

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  static async create (
    {
      title = required(),
      icon,
      parentId,
      userId = required(),
      bookId = required(),
      body,
      teamId,
      order,
      isLocked,
      state
    } = {}) {
    const result = await seq.transaction(async t => {
      const project = await models.project.create({
        title,
        icon,
        body,
        bookId,
        parentId,
        order,
        isLocked,
        state,
        userId: teamId ? null : userId
      });

      if (teamId) {
        const team = await models.team.findByPk(teamId, {
          transaction: t
        });

        const accesses = await models.teamAccess.findAll({
          where: {
            teamId: team.id,
            bookId: bookId,
            projectId: null
          },
          attributes: ['userId'],
          transaction: t,
          raw: true
        });

        for (const access of accesses) {
          await models.teamAccess.create({ // TODO: check if this is actually
            mode: 'write',
            userId: access.userId,
            teamId: teamId,
            bookId: bookId,
            projectId: project.id
          }, {
            transaction: t
          });
        }
      }

      return project.get();
    });

    const obj = Object.assign({}, result);

    delete obj.document;

    await elasticsearch.updateById({
      id: result.id,
      obj: obj,
      modelName: 'project',
      upsert: true
    });

    await ActivityProducerService.sendMessage({
      from: null,
      to: {
        id: result.id
      },
      creatorId: userId,
      entity: 'project',
      type: 'book'
    });

    return result;
  }

  static async sendByEmail ({
    userId = required(),
    projectId = required(),
    email = required(),
    html = required(),
    teamId
  } = {}) {
    const project = await models.project.findOne({
      where: {
        userId: teamId ? null : userId,
        id: projectId
      }
    });
    if (!project) throw new Error('Page not found');

    const body = project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    sendgrid.sendHtml({
      from: config.share.emailFrom,
      to: email,
      apiKey: process.env.SENDGRID_API_KEY,
      subject: project.title,
      html: data,
      name: config.share.emailName
    });
  }

  static async sendSharedByEmail ({
    shareId = required(),
    projectId = required(),
    html = required(),
    email = required()
  } = {}) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: projectId,
        isActive: true
      },
      include: [{
        model: models.project,
        required: true,
        attributes: ['id', 'body', 'title']
      }]
    });

    if (!shareLink) throw new Error('Share link not found');

    const body = shareLink.project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    sendgrid.sendHtml({
      from: config.share.emailFrom,
      to: email,
      apiKey: process.env.SENDGRID_API_KEY,
      subject: shareLink.project.title,
      html: data,
      name: config.share.emailName
    });
  }

  static async getShared ({
    projectId = required(),
    shareId = required()
  } = {}) {
    // TODO: delete comments
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: projectId,
        isActive: true
      },
      include: [{
        model: models.project,
        required: true,
        attributes: {
          exclude: ['deletedAt', 'parentId', 'userId']
        },
        include: [
          {
            model: models.comment,
            include: [
              {
                model: models.user,
                attributes: ['id'],
                include: [
                  {
                    model: models.profile
                  }
                ]
              }
            ]
          }
        ]
      }]
    });

    if (!shareLink) throw new Error('Share link not found');

    return shareLink.project;
  }

  static async getById ({
    id = required()
  } = {}) {
    return models.project.findByPk(id);
  }

  static async getAll ({
    userId = required(),
    teamId
  } = {}) {
    let where;

    if (teamId) {
      where = {
        '$teamAccesses.mode$': 'write',
        '$teamAccesses.user_id$': userId,
        '$teamAccesses.team_id$': teamId
      };
    } else {
      where = {
        userId: userId
      };
    }

    const projects = await models.project.findAll({
      where,
      attributes: ['id', 'title', 'icon'],
      include: [
        {
          model: models.teamAccess,
          required: false,
          attributes: []
        },
        {
          model: models.project,
          as: 'parent',
          attributes: ['id', 'title', 'icon'],
          include: [{
            model: models.book,
            attributes: ['id', 'title'],
            required: true
          }]
        },
        {
          model: models.book,
          attributes: ['id', 'title'],
          required: true
        }
      ],
      order: [['order', 'desc'], ['createdAt', 'desc']]
    });

    return {
      projects: projects.map(p => p.get())
    };
  }

  static async getDeletedProjects ({
    userId = required(),
    teamId
  } = {}) {
    const where = {
      isSection: false
    };

    if (teamId) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          mode: 'write',
          userId: userId,
          teamId: teamId,
          bookId: { [Op.ne]: null },
          projectId: null
        },
        paranoid: false
      });

      const ids = teamAccess.map(t => t.bookId);

      where.id = ids;
    } else {
      where.userId = userId;
    }

    const books = await models.book.findAll({
      where: where,
      attributes: ['id'],
      raw: true
    });

    const ids = books.map(item => item.id);

    const projects = await models.project.findAll({
      where: {
        userId: teamId ? null : userId,
        bookId: ids,
        deletedAt: {
          [Op.ne]: null
        }
      },
      include: [
        {
          attributes: ['size'],
          model: models.attachment
        },
        {
          model: models.book,
          attributes: ['title']
        }
      ],
      order: [['deletedAt', 'desc']],
      attributes: ['id', 'title', 'deletedAt', 'icon'],
      paranoid: false
    });

    const sizes = projects.reduce((prev, next) => {
      prev[next.id] = next.attachments.reduce((p, n) => {
        return (p += n.size);
      }, 0);
      return prev;
    }, {});

    return {
      projects: projects.map(b => {
        delete b.attachments;
        return b.get();
      }),
      sizes
    };
  }

  static async getSize ({
    userId = required(),
    projectId = required(),
    teamId
  } = {}) {
    const project = await models.project.findOne({
      attributes: ['id'],
      where: {
        userId: teamId ? null : userId,
        id: projectId
      },
      include: [{
        model: models.attachment,
        attributes: ['size']
      }],
      paranoid: false
    });
    if (!project) throw new Error('Page not found');

    return project.attachments.reduce((prev, next) => {
      return (prev += next.size);
    }, 0);
  }

  static async getSizeOfSharedProject ({
    shareId = required(),
    projectId = required()
  } = {}) {
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

    const project = await models.project.findOne({
      attributes: ['id'],
      where: {
        id: projectId
      },
      include: [{
        model: models.attachment,
        attributes: ['size']
      }],
      paranoid: false
    });
    if (!project) throw new Error('Page not found');

    return project.attachments.reduce((prev, next) => {
      return (prev += next.size);
    }, 0);
  }

  static async delete ({
    id = required(),
    userId = required(),
    permanent = false,
    teamId
  } = {}) {
    const projectToDelete = await ProjectRepo.getByIdiWthBook(id);

    if (permanent) {
      const deleteCount = await models.project.destroy({
        where: {
          id: id,
          userId: teamId ? null : userId
        },
        paranoid: false
      });

      if (deleteCount) {
        throw new Error('Project was not deleted');
      }

      return;
    }

    const result = await seq.transaction(async t => {
      const project = await models.project.findOne({
        attributes: ['id'],
        where: {
          id: id,
          userId: teamId ? null : userId
        },
        include: [{
          model: models.project,
          as: 'subProject',
          attributes: ['id'],
          include: [{
            model: models.project,
            as: 'subProject',
            attributes: ['id']
          }]
        }],
        transaction: t,
        paranoid: false
      });
      const ids = [project.id];

      if (project.subProject.length > 0) {
        project.subProject.forEach(s => {
          ids.push(s.id);
          if (s.subProject.length > 0) {
            s.subProject.forEach(sp => ids.push(sp.id));
          }
        });
      }

      await models.project.destroy({
        where: {
          id: ids,
          userId: teamId ? null : userId
        },
        transaction: t,
        paranoid: false
      });

      if (teamId) {
        await models.teamAccess.destroy({
          where: {
            mode: 'write',
            teamId: teamId,
            projectId: ids
          },
          transaction: t,
          paranoid: false
        });

        await models.notification.destroy({
          where: {
            projectId: ids
          },
          transaction: t,
          paranoid: false
        });
      }

      await models.attachment.destroy({
        where: {
          projectId: ids
        },
        transaction: t,
        paranoid: false
      });
    });
    await ActivityProducerService.sendMessage({
      from: {
        id: id,
        teamId: projectToDelete.book.teamId,
        bookId: projectToDelete.bookId,
        title: projectToDelete.title
      },
      to: null,
      creatorId: userId,
      entity: 'project',
      type: 'book'
    });

    return result;
  }

  static async updateShared ({
    id = required(),
    title,
    document,
    icon,
    body,
    state,
    isLocked,
    shareId = required()
  } = {}) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: id,
        mode: 'write',
        isActive: true
      },
      include: [{
        model: models.project,
        required: true,
        attributes: ['id']
      }]
    });
    if (!shareLink) throw new Error('Share link not found');

    await models.project.update(
      {
        title,
        document,
        body,
        icon,
        state,
        isLocked
      },
      {
        where: {
          id: id
        }
      }
    );

    await elasticsearch.updateById({
      id: id,
      obj: {
        title,
        icon,
        body
      },
      modelName: 'project'
    });
  }

  static async update ({
    id = required(),
    title,
    document,
    icon,
    body,
    state,
    isLocked,
    bookId,
    parentId,
    userId = required(),
    teamId
  } = {}) {
    const projectBeforeUpdate = await ProjectRepo.getById(id);
    const [count, updatedProjects] = await models.project.update(
      {
        title,
        document,
        body,
        icon,
        state,
        bookId,
        parentId,
        isLocked
      },
      {
        where: {
          id: id,
          userId: teamId ? null : userId
        },
        returning: true
      }
    );

    if (!count) {
      throw new Error('Page not found');
    }

    await elasticsearch.updateById({
      id: id,
      obj: {
        title,
        icon,
        body,
        bookId
      },
      modelName: 'project'
    });

    await ActivityProducerService.sendMessage({
      from: projectBeforeUpdate,
      to: updatedProjects[0],
      creatorId: userId,
      entity: 'project',
      type: 'book'
    });
  }

  static async restore ({
    id = required(),
    userId = required(),
    teamId
  } = {}) {
    return seq.transaction(async t => {
      const count = await models.project.update(
        {
          deletedAt: null
        },
        {
          where: {
            id: id,
            userId: teamId ? null : userId
          },
          paranoid: false,
          transaction: t
        }
      );

      if (teamId) {
        await models.teamAccess.update({
          deletedAt: null
        },
        {
          where: {
            mode: 'write',
            teamId: teamId,
            projectId: id
          },
          transaction: t,
          paranoid: false
        });

        await models.notification.update({
          deletedAt: null
        }, {
          where: {
            projectId: id
          },
          transaction: t,
          paranoid: false
        });
      }

      await models.attachment.update(
        {
          deletedAt: null
        },
        {
          where: {
            projectId: id,
            userId: userId
          },
          paranoid: false,
          transaction: t
        }
      );

      if (count[0] === 0) throw new Error('Page not found');
    });
  }

  static async isUserProject (id, userId) {
    const project = await models.project.findOne({
      where: {
        userId: userId,
        id: id
      }
    });
    return !!project;
  }

  static async order ({
    ids = required(),
    userId = required(),
    teamId
  } = {}) {
    return seq.transaction(async t => {
      for (const [index, id] of ids.entries()) {
        await models.project.update(
          {
            order: index
          },
          {
            where: {
              id: id,
              userId: teamId ? null : userId
            },
            transaction: t
          }
        );
      }
    });
  }

  static async exportPdf ({
    projectId = required(),
    userId = required(),
    html = required(),
    teamId
  } = {}) {
    const project = await models.project.findOne({
      where: {
        userId: teamId ? null : userId,
        id: projectId
      }
    });

    if (!project) throw new Error('Page not found');

    const body = project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    const buffer = await this._exportPdf(data);
    return buffer;
  }

  static async exportSharedProjectAsPdf ({
    projectId = required(),
    shareId = required(),
    html = required()
  } = {}) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: projectId,
        isActive: true
      },
      include: [{
        model: models.project,
        required: true
      }]
    });

    if (!shareLink) throw new Error('Share link not found');

    const body = shareLink.project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    const buffer = await this._exportPdf(data);
    return buffer;
  }

  static async exportDocx ({
    projectId = required(),
    userId = required(),
    html = required(),
    teamId
  } = {}) {
    const project = await models.project.findOne({
      attributes: ['title, body'],
      where: {
        userId: teamId ? null : userId,
        id: projectId
      }
    });

    if (!project) throw new Error('Page not found');

    const body = project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    const buffer = await this._exportDocx(project, data);
    return buffer;
  }

  static async exportSharedProjectAsDocx ({
    projectId = required(),
    shareId = required(),
    html = required()
  } = {}) {
    const shareLink = await models.shareLink.findOne({
      where: {
        id: shareId,
        projectId: projectId,
        isActive: true
      },
      include: [{
        model: models.project,
        required: true,
        attributes: ['id', 'body', 'title']
      }]
    });
    if (!shareLink) throw new Error('Share link not found');

    const body = shareLink.project.body.replace(/<\s*p*>( ?)<\s*\/*p>/g, '<br/>').replace(/<\s*h1*><\s*\/*h1>/g, '<h1><br/></h1>');
    const data = html.replace(/insert_body_here/g, body).replace(/@(null|users|pages)\b/g, '');

    const buffer = await this._exportDocx(shareLink.project.title, data);
    return buffer;
  }

  static async _exportDocx (title, html) {
    const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

    const job = await cloudConvert.jobs.create({
      tasks: {
        getFile: {
          operation: 'import/base64',
          file: Buffer.from(html).toString('base64'), // convert html to base64
          filename: 'input.html'
        },
        convert: {
          operation: 'convert',
          input_format: 'html',
          output_format: 'docx',
          engine: 'office',
          input: 'getFile',
          embed_images: true,
          engine_version: '2019',
          filename: `${title}.docx`,
          wait: true
        },
        export: {
          operation: 'export/url',
          input: ['convert'],
          inline: false,
          archive_multiple_files: false
        }
      }
    });

    const finishedJob = await cloudConvert.jobs.wait(job.id);

    const exportTask = finishedJob.tasks.filter(
      task => task.operation === 'export/url' && task.status === 'finished'
    )[0];

    const file = exportTask.result.files[0];

    return file;
  };

  static async _exportPdf (html) {
    const buffer = new Promise((resolve, reject) => {
      pdf.create(html, {
        height: '1415px',
        width: '1000px',
        header: {
          height: '20px'
        },
        footer: {
          height: '20px'
        },
        childProcessOptions: {
          env: {
            OPENSSL_CONF: '/dev/null'
          }
        }
      }).toBuffer((err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });

    return buffer;
  }

  static async getBookProjects ({
    bookId = required(),
    userId
  }) {
    return ProjectRepo.getAllByBookAndUserId(bookId, userId);
  }
}

module.exports = ProjectService;
