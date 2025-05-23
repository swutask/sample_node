'use strict';

const models = require('../models');
const { required } = require('../utils');
const ShareLinkRepo = require('../repos/ShareLinkRepo');

class SharingService {
  static async getByProjectId (id) {
    const share = await models.shareLink.findOne({
      where: {
        projectId: id
      }
    });

    return share ? share.toJson() : {};
  }

  static async getById (id) {
    const share = await ShareLinkRepo.getByIdWithIncludes(id);

    if (!share) throw new Error('Share link not found');

    const result = share.toJson();
    result.team = {
      name: share.user.teamMember?.team?.name || null,
      logo: share.user.teamMember?.team?.teamLogo?.url || null
    };

    return result;
  }

  static async getShareLink ({
    userId = required(),
    projectId = required(),
    mode = required(),
    isActive = required(),
    teamId
  } = {}) {
    const project = await models.project.findOne({
      attributes: ['id'],
      where: {
        userId: teamId ? null : userId,
        id: projectId
      }
    });
    if (!project) throw new Error('Page not found');

    const [share] = await models.shareLink.upsert({
      userId: userId,
      projectId: projectId,
      isActive: isActive,
      mode: mode
    });

    return share.toJson();
  }
}

module.exports = SharingService;
