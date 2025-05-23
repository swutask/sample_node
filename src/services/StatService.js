const { required } = require('../utils/index');
const BookRepo = require('../repos/BookRepo');
const models = require('../models/index');

async function getStats ({
  teamId = required()
}) {
  const uniqueBookIds = await BookRepo.getUniqIdsByTeamAccessTeamId(teamId);

  const size = await models.attachment.sum('size', {
    where: {
      teamId: teamId
    }
  });

  const members = await models.teamMember.count({
    where: {
      teamId: teamId
    }
  });

  const tasks = await models.task.count({
    where: {
      bookId: uniqueBookIds,
      isSample: false
    }
  });

  const activeTasks = await models.task.count({
    where: {
      bookId: uniqueBookIds,
      completedAt: null,
      isSample: false
    }
  });

  const projects = await models.project.count({
    where: {
      bookId: uniqueBookIds
    }
  });

  const clients = await models.clientToTeam.count({
    where: {
      teamId
    }
  });

  return {
    clients,
    members,
    size,
    projects,
    books: uniqueBookIds.length,
    tasks,
    activeTasks
  };
}

module.exports = {
  getStats
};
