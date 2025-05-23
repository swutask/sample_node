const models = require('../models');
const { required } = require('../utils/index');

class TagToTaskRepo {
  /**
   * @param taskId {number}
   * @param tagIds {number[]}
   * @return {Promise<boolean>}
   */
  static async deleteByTaskIdAndTagIds (taskId = required(), tagIds = required()) {
    const count = await models.tagToTask.destroy({
      where: {
        taskId,
        tagId: tagIds
      },
      paranoid: false,
      force: true
    });

    return tagIds.length === count;
  }
}

module.exports = TagToTaskRepo;
