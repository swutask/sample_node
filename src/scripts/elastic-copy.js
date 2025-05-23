'use strict';

require('../utils').dotEnv();

const { sequelize } = require('../loaders');
const models = require('../models');
const { elasticsearch } = require('../libs/index');
const { removeHtmlTagsFromObject } = require('../utils/index');

/**
 * @param elasticClient
 * @param existsIndexes {string[]}
 * @param indexName {string}
 * @param fieldNames {string[]}
 * @return {Promise<void>}
 */
async function addIndex (elasticClient, existsIndexes, indexName, fieldNames) {
  if (existsIndexes.includes(indexName)) {
    return;
  }

  await elasticClient.indices.create({
    index: indexName,
    body: {
      mappings: {
        properties: fieldNames.reduce((accumulator, fieldName) => {
          accumulator[fieldName] = {
            type: 'text'
          };

          return accumulator;
        }, {})
      }
    }
  });
}

function logResponseErrors (bulkResponse) {
  if (!bulkResponse.errors) {
    return;
  }

  const erroredProjects = [];
  bulkResponse.items.forEach(action => {
    const operation = Object.keys(action)[0];
    if (action[operation].error) {
      erroredProjects.push({
        error: action[operation].error
      });
    }
  });
  console.log(erroredProjects);
}

async function getItems ({
  model,
  limit,
  offset,
  withoutDeleted
}) {
  if (!model) return [];

  switch (model) {
    case 'member' : {
      const members = await models.teamMember.findAll({
        attributes: ['id'],
        include: {
          model: models.user,
          attributes: ['email'],
          include: {
            model: models.profile,
            attributes: [
              'firstName',
              'lastName'
            ]
          }
        },
        limit,
        offset,
        paranoid: withoutDeleted
      });

      return members.map((member) => {
        const data = member.get();

        return {
          id: data.id,
          email: data.user?.email,
          firstName: data.user?.profile?.firstName,
          lastName: data.user?.profile?.lastName
        };
      });
    }

    default: {
      const data = await models[model].findAll({
        limit,
        offset,
        paranoid: withoutDeleted
      });

      return data.map(d => d.get());
    }
  }
}

async function main () {
  await sequelize.loadModels();

  try {
    const client = elasticsearch.getClient();
    const existsIndexes = await elasticsearch.getIndexes();

    for (const indexData of elasticsearch.elasticIndexes) {
      const limit = 5000;
      let offset = 0;

      const indexName = indexData.name;
      await addIndex(client, existsIndexes, indexName, indexData.fieldsForIndexing);

      console.time('all ' + indexData.name);
      while (true) {
        console.time(`time-${offset}-${indexName}`);
        console.time(`select-${offset}-${indexName}`);

        const items = await getItems({
          model: indexData.model,
          withoutDeleted: indexData.withoutDeleted,
          limit,
          offset
        });

        if (!items.length) {
          console.log(indexName, 'Skip');

          break;
        }

        console.timeEnd(`select-${offset}-${indexName}`);

        // TODO use elastic.bulkCreate()
        const body = [];
        for (const item of items) {
          if (indexData.model === 'project') {
            delete item.state;
            delete item.document;
          }

          body.push(
            { index: { _index: indexName, _id: item.id } },
            removeHtmlTagsFromObject(item, elasticsearch.elasticIndexes[indexData.name]?.fieldsForReturning || [])
          );
        }

        const bulkResponse = await client.bulk({ body });

        console.log(indexName, `added ${bulkResponse.body.items.length}`);
        console.log(indexName, 'bulkResponse.errors', bulkResponse.errors);
        logResponseErrors(bulkResponse);

        console.timeEnd(`time-${offset}-${indexName}`);

        offset += limit;
      }

      console.timeEnd('all ' + indexData.name);
      console.log('\n');
    }
  } catch (err) {
    const stringError = JSON.stringify(err, null, 2);
    const errorsMessages = stringError === '{}' ? err : stringError;
    console.log('ERROR', errorsMessages);
  } finally {
    await sequelize.sequelize.close();
  }
}
main();
