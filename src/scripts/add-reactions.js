'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');
const reactions = [
  'ok',
  'smile',
  'heart_eyes',
  'disappointed_face',
  'sunglasses',
  'clap',
  'ghost',
  'party_popper',
  'love',
  'fire'
];

async function main () {
  await sequelize.loadModels();
  const existsReactions = await models.reaction.findAll({
    where: {
      name: reactions
    }
  });
  const existsNames = existsReactions.map((reaction) => reaction.name);
  const reactionsToCreate = reactions.reduce((accumulator, reactionName) => {
    if (!existsNames.includes(reactionName)) {
      accumulator.push({
        name: reactionName
      });
    }

    return accumulator;
  }, []);
  const createdReactions = await models.reaction.bulkCreate(reactionsToCreate);

  if (createdReactions) {
    const logData = createdReactions.map(({ id, name }) => {
      return {
        id,
        name
      };
    });
    console.log(`Created reactions:\n${JSON.stringify(logData, null, 2)}`);
  }

  await sequelize.sequelize.close();
}

main();
