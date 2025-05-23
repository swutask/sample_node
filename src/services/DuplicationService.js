'use strict';
const models = require('../models');
const { required } = require('../utils');

const { generateHTML, generateJSON } = require('@tiptap/html');
const { depthPageExtensions, pageExtensions } = require('../libs/tiptap/extensions');

// const CleanService = require('./CleanService');
const CheckService = require('./CheckService');
// const SocketNotifyService = require('./SocketNotifyService');
const BookService = require('./BookService');
const TaskService = require('./TaskService');
const ProjectService = require('./ProjectService');
const AttachmentService = require('./AttachmentService');

const { getAttachments } = require('../core/helpers');

class DuplicationService {
  static async duplicateAttachment ({
    id,
    userId,
    teamId,
    taskId,
    projectId,
    bookId
  } = {}) {
    const attachment = await models.attachment.findByPk(id);

    if (!attachment) return {};

    return AttachmentService.duplicate({
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      bookId: bookId,
      projectId: projectId,
      userId: userId,
      teamId: teamId,
      taskId: taskId,
      isTaskThumbnail: attachment.isTaskThumbnail,
      showInModal: attachment.showInModal,
      showInCard: attachment.showInCard,
      key: attachment.key
    });
  }

  static async duplicateContent ({
    html,
    extensions,
    userId,
    teamId,
    taskId,
    projectId,
    bookId
  }) {
    const json = generateJSON(html, extensions);

    const { images, files } = getAttachments({ json, returnAsArray: false });

    let newContent = json.content;

    const data = {
      bookId: bookId,
      projectId: projectId,
      userId: userId,
      teamId: teamId,
      taskId: taskId
    };

    for (const id of files) {
      data.id = id;

      const newFile = await this.duplicateAttachment(data);

      newContent = newContent.map(item => {
        if (item.type === 'file' && +item.attrs.id === +id) {
          return {
            ...item,
            attrs: {
              ...item.attrs,
              id: newFile.id,
              url: newFile.url
            }
          };
        }

        return item;
      });
    }

    for (const id of images) {
      data.id = id;

      const newImage = await this.duplicateAttachment(data);

      newContent = newContent.map(item => {
        if (item.type === 'paragraph' && item.content?.length) {
          return {
            type: 'paragraph',
            content: item.content.map(el => {
              if (el.type === 'image' && +el.attrs.id === +id) {
                return {
                  ...el,
                  attrs: {
                    ...el.attrs,
                    id: newImage.id,
                    src: newImage.url
                  }
                };
              }

              return el;
            })
          };
        }

        return item;
      });
    }

    return generateHTML({
      type: 'doc',
      content: newContent
    }, extensions);
  }

  static async duplicateTask ({
    id = required(),
    userId = required(),
    newBookId = required(),
    oldBookId = required(),
    teamId = null
  } = {}) {
    await CheckService.checkUserBook({ bookIds: [oldBookId], userId, teamId, hasClientAccess: false });

    let userOrTeamId = { userId };
    if (teamId) userOrTeamId = { teamId };

    const oldTask = await models.task.findOne({
      where: {
        id,
        bookId: oldBookId,
        ...userOrTeamId
      },
      include: [
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project },
        {
          model: models.attachment,
          where: { isTaskThumbnail: true },
          required: false,
          // TODO move to constant
          attributes: ['url', 'id', 'showInModal', 'showInCard', 'order']
        },
        {
          model: models.teamMember,
          include: {
            model: models.user,
            attributes: ['id'],
            include: [{
              model: models.profile,
              attributes: ['firstName', 'lastName', 'color']
            }, {
              model: models.avatar,
              attributes: ['url']
            }]
          }
        },
        { model: models.chat },
        {
          model: models.task,
          as: 'subTask',
          include: [
            { model: models.taskTag },
            {
              model: models.teamMember,
              include: {
                model: models.user,
                attributes: ['id'],
                include: [{
                  model: models.profile,
                  attributes: ['firstName', 'lastName', 'color']
                },
                {
                  model: models.avatar,
                  attributes: ['url']
                }]
              }
            }
          ]
        }
      ]
    });

    if (!oldTask) throw new Error('Task not found');

    const taskRow = await models.taskRow.findByPk(oldTask.taskRowId);
    let newTaskRow = await models.taskRow.findOne({
      where: {
        bookId: newBookId,
        title: taskRow.title
      }
    });

    if (!newTaskRow) {
      const newTaskRows = await models.taskRow.findAll({
        where: {
          bookId: newBookId
        },
        attributes: ['id', 'order'],
        limit: 1,
        order: [
          ['order', 'asc']
        ]
      });

      newTaskRow = newTaskRows[0];
    }

    const taskTags = await models.taskTag.findAll({
      where: {
        color: oldTask.taskTags.map(t => t.color),
        bookId: newBookId
      }
    });

    const teamAccesses = await models.teamAccess.findAll({
      where: {
        mode: 'write',
        teamId,
        bookId: newBookId,
        projectId: null
      }
    });

    const uniqueUsers = [...new Map(teamAccesses.map(item => [item.userId, item.dataValues])).values()];

    const teamMembers = await models.teamMember.findAll({
      where: {
        userId: uniqueUsers.map(u => u.userId),
        id: oldTask.teamMembers.map(m => m.id)
      }
    });

    const newTask = await TaskService.create({
      userId,
      teamId,
      bookId: newBookId,
      subTitle: oldTask.subTitle,
      urgentStatus: oldTask.urgentStatus,
      storyPoints: oldTask.storyPoints,
      startDate: oldTask.startDate,
      endDate: oldTask.endDate,
      completedAt: oldTask.completedAt,
      taskRowId: newTaskRow?.id || oldTask.taskRowId,
      parentId: oldTask.parentId,
      isSample: oldTask.isSample,
      order: oldTask.order,
      tagIds: taskTags.map(t => t.id),
      title: oldTask.title,
      teamMembers: teamMembers.map(t => t.id),
      movedFromTaskId: oldTask.id,
      collaborationKey: oldTask.collaborationKey
    });

    const subTasks = [];

    if (oldTask.subTask.length > 0) {
      for (const subTask of oldTask.subTask) {
        const subTaskTeamMembers = subTask.teamMembers || [];

        const newSubTask = await TaskService.create({
          parentId: newTask.id,
          userId,
          teamId,
          subTitle: subTask.subTitle,
          endDate: subTask.endDate,
          startDate: subTask.startDate,
          urgentStatus: subTask.urgentStatus,
          storyPoints: subTask.storyPoints,
          completedAt: subTask.completedAt,
          taskRowId: newTask.taskRowId,
          order: subTask.order,
          // tagIds: subTask.taskTags.map(t => t.id),
          bookId: newBookId,
          title: subTask.title,
          teamMembers: subTaskTeamMembers.map(m => m.id)
        });

        subTasks.push(newSubTask);
      }
    }

    if (oldTask.additionalInfo) {
      const body = await this.duplicateContent({
        html: oldTask.additionalInfo,
        extensions: depthPageExtensions,
        userId,
        teamId,
        taskId: newTask.id,
        projectId: undefined,
        bookId: newBookId
      });

      await models.task.update({
        additionalInfo: body
      }, {
        where: {
          id: newTask.id
        }
      });

      return {
        ...newTask,
        additionalInfo: body,
        subTask: subTasks
      };
    }

    if (oldTask.attachments[0]) {
      const cover = await this.duplicateAttachment({
        id: oldTask.attachments[0].id,
        taskId: newTask.id,
        userId
      });

      newTask.attachments = [cover];
    }

    return newTask;
  }

  static async moveTaskToBook ({
    id = required(),
    userId = required(),
    newBookId = required(),
    oldBookId = required(),
    teamId = null
  } = {}) {
    await CheckService.checkUserBook({ bookIds: [oldBookId], userId, teamId, hasClientAccess: false });

    const newTask = await this.duplicateTask({
      id,
      userId,
      oldBookId,
      newBookId,
      teamId
    });

    if (newTask) {
      await TaskService.delete({
        id,
        userId,
        bookId: oldBookId,
        teamId
      });
    }

    return newTask;
  }

  static async duplicateProject ({
    id = required(),
    userId = required(),
    newBookId = required(),
    oldBookId = required(),
    teamId = null,
    parentId
  } = {}) {
    const oldProject = await models.project.findOne({
      where: {
        id,
        bookId: oldBookId
      },
      include: [{
        model: models.project,
        as: 'subProject',
        attributes: ['id', 'title', 'icon']
      }]
    });

    if (!oldProject) throw new Error('Page not found');

    const newProject = await ProjectService.create({
      userId,
      teamId,
      bookId: newBookId,
      parentId,
      title: oldProject.title,
      body: oldProject.body,
      document: oldProject.document,
      order: oldProject.order,
      isLocked: oldProject.isLocked,
      icon: oldProject.icon
    });

    const subProjects = [];

    if (oldProject.subProject?.length > 0) {
      for (const subProject of oldProject.subProject) {
        const newSubProject = await this.duplicateProject({
          id: subProject.id,
          userId,
          oldBookId: oldBookId,
          newBookId: newBookId,
          teamId,
          parentId: newProject.id
        });
        subProjects.push(newSubProject);
      }
    }

    if (oldProject.body) {
      const body = await this.duplicateContent({
        html: oldProject.body,
        extensions: pageExtensions,
        userId,
        teamId,
        taskId: undefined,
        projectId: newProject.id,
        bookId: newBookId
      });

      await models.project.update({
        body: body
      }, {
        where: {
          id: newProject.id
        }
      });

      return {
        ...newProject,
        body: body,
        subProject: subProjects
      };
    }

    return {
      ...newProject,
      subProject: subProjects
    };
  }

  static async duplicateAllTasks ({
    oldBookId = required(),
    newBookId = required(),
    userId = required(),
    teamId
  } = {}) {
    const tasks = await models.task.findAll({
      where: {
        bookId: oldBookId,
        parentId: null
      },
      include: [
        { model: models.taskTag },
        { model: models.taskRow },
        { model: models.project }
      ]
    });

    for (const task of tasks) {
      await this.duplicateTask({
        id: task.id,
        userId: userId,
        oldBookId: oldBookId,
        newBookId: newBookId,
        teamId: teamId
      });
    }
  }

  static async duplicateAllProjects ({
    oldBookId = required(),
    newBookId = required(),
    userId = required(),
    teamId
  } = {}) {
    const projects = await models.project.findAll({
      where: {
        bookId: oldBookId,
        parentId: null
      }
    });

    for (const project of projects) {
      await this.duplicateProject({
        id: project.id,
        userId: userId,
        oldBookId: oldBookId,
        newBookId: newBookId,
        teamId: teamId
      });
    }
  }

  static async duplicateBook ({
    id = required(),
    userId = required(),
    teamId = null
  } = {}) {
    const oldBook = await models.book.findOne({
      where: {
        id: id,
        userId: teamId ? null : userId
      },
      include: [
        { model: models.project },
        { model: models.bookLink },
        {
          model: models.bookOrder,
          attributes: ['order', 'createdAt'],
          where: {
            userId: userId
          },
          required: false
        }
      ]
    });

    if (!oldBook) throw new Error('Project not found');

    let members = [];

    if (teamId) {
      const teamAccess = await models.teamAccess.findAll({
        where: {
          mode: 'write',
          teamId: teamId,
          bookId: oldBook.id
        }
      });

      const uniqueUsers = [...new Map(teamAccess.map(item => [item.userId, item.dataValues])).values()];

      members = await models.teamMember.findAll({
        where: {
          userId: uniqueUsers.map(u => u.userId),
          teamId: teamId
        },

        include: [
          {
            model: models.user,
            attributes: ['id'],
            include: [
              {
                model: models.profile
              },
              {
                model: models.avatar,
                attributes: ['url']
              }
            ]
          }
        ]
      });

      members = members.filter(u => u.userId !== userId);
    }

    const newBook = await BookService.createWithTransaction({
      userId,
      teamId,
      title: oldBook.title,
      icon: oldBook.icon,
      color: oldBook.color,
      favorite: oldBook.favorite,
      isSample: oldBook.isSample,
      subTitle: oldBook.subTitle,
      order: oldBook.order,
      isSection: oldBook.isSection,
      members: members.map(m => m.id),
      duplicate: true
    });

    if (oldBook.bookLinks?.length > 0) {
      for (const link of oldBook.bookLinks) {
        await models.bookLink.create({
          url: link.url,
          name: link.name,
          bookId: newBook.id,
          userId: link.userId,
          description: link.description
        });
      }
    }

    // create task tags
    const taskTags = await models.taskTag.findAll({
      where: {
        bookId: oldBook.id
      }
    });
    for (const tag of taskTags) {
      await models.taskTag.create({
        color: tag.color,
        name: tag.name,
        bookId: newBook.id
      });
    }

    // create task rows
    const oldTaskRows = await models.taskRow.findAll({
      where: {
        bookId: oldBook.id
      }
    });
    for (const row of oldTaskRows) {
      await models.taskRow.create({
        title: row.title,
        color: row.color,
        bookId: newBook.id,
        teamId,
        userId: teamId ? null : userId,
        order: row.order
      });
    }

    await this.duplicateAllTasks({
      oldBookId: oldBook.id,
      newBookId: newBook.id,
      userId,
      teamId
    });

    await this.duplicateAllProjects({
      oldBookId: oldBook.id,
      newBookId: newBook.id,
      userId,
      teamId
    });

    const oldAttachments = await models.attachment.findAll({
      where: {
        bookId: oldBook.id,
        taskId: null,
        projectId: null
      }
    });

    if (oldAttachments.length > 0) {
      for (const attachment of oldAttachments) {
        await this.duplicateAttachment({
          id: attachment.id,
          userId,
          teamId,
          bookId: newBook.id
        });
      }
    }

    return newBook;
  }
}

module.exports = DuplicationService;
