const models = require('../models/index');
const { required } = require('../utils/index');

class TaskToMemberRepo {
  /**
   * @param taskId {number}
   * @param teamMemberIds {number[]}
   * @return {Promise<boolean>}
   */
  static async deleteByTaskAndTeamMemberIds (taskId = required(), teamMemberIds = required()) {
    const count = await models.taskToMember.destroy({
      where: {
        taskId,
        teamMemberId: teamMemberIds
      },
      paranoid: false,
      force: true
    });

    return count === teamMemberIds.length;
  }
}

module.exports = TaskToMemberRepo;
