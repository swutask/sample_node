const models = require('../models');

/**
 * @param userIds {number[]}
 * @return {Promise<string[]>}
 */
async function getEmailsByUserIds (userIds) {
  const profiles = await models.profile.findAll({
    where: {
      userId: userIds
    },
    attributes: ['email']
  });

  return profiles.map((profile) => profile.email);
}

module.exports = {
  getEmailsByUserIds
};
