'use strict';

const { Client } = require('@elastic/elasticsearch');
const {
  required,
  catchAndLogError
} = require('../utils');
const { removeHtmlTagsFromObject } = require('../utils/index');

const elasticIndexes = [
  {
    name: 'complex-project',
    model: 'project',
    fieldsForIndexing: ['body', 'title'],
    fieldsForReturning: ['body', 'title', 'icon', 'bookId'],
    fieldsForResponse: ['body', 'title', 'icon', 'bookId'],
    withoutDeleted: false
  },
  {
    name: 'complex-book',
    model: 'book',
    fieldsForIndexing: ['subTitle', 'title'],
    fieldsForReturning: ['subTitle', 'title', 'color', 'icon'],
    fieldsForResponse: ['subTitle', 'title', 'color', 'icon'],
    withoutDeleted: false
  },
  {
    name: 'complex-task',
    model: 'task',
    fieldsForIndexing: ['title', 'subTitle', 'additionalInfo'],
    fieldsForReturning: ['title', 'subTitle', 'additionalInfo', 'bookId', 'parentId'],
    fieldsForResponse: ['title', 'subTitle', 'additionalInfo', 'bookId', 'parentId'],
    withoutDeleted: true
  },
  {
    name: 'complex-message',
    model: 'message',
    fieldsForIndexing: ['text'],
    fieldsForReturning: ['text'],
    fieldsForResponse: '*',
    withoutDeleted: true
  },
  {
    name: 'complex-member',
    model: 'member',
    fieldsForIndexing: ['email', 'firstName', 'lastName'],
    fieldsForReturning: ['email', 'firstName', 'lastName'],
    fieldsForResponse: '*',
    withoutDeleted: true
  },
  {
    name: 'complex-attachment',
    model: 'attachment',
    fieldsForIndexing: ['name'],
    fieldsForReturning: ['name', 'url', 'bookId', 'mimetype'],
    fieldsForResponse: ['name', 'url', 'bookId', 'mimetype'],
    withoutDeleted: true
  }
];

let clientConfig = {
  node: `https://${process.env.ELASTICSEARCH_HOST}`,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
};

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'e2e') {
  clientConfig = {
    node: `http://${process.env.ELASTICSEARCH_HOST}`
  };
}

const client = new Client(clientConfig);

/**
 * @param index {string}
 * @param body {Object}
 * @return {Promise<{hints: *[]}>}
 */
async function search (index, body) {
  const elasticIndexData = elasticIndexes.find(item => item.model === index);

  const response = await client.search({
    index: elasticIndexData?.name,
    body
  });

  return {
    hints: response.body.hits?.hits
  };
}

const multiSearch = async ({ body }) => {
  const recordsFromElastic = [];
  const response = await client.msearch({
    body
  });

  for (const record of response.body.responses) {
    if (record.error) {
      throw new Error(record.error.caused_by?.reason || record.error.reason);
    }

    recordsFromElastic.push(...record?.hits?.hits);
  }

  return recordsFromElastic;
};

const deleteIndexes = (index, ignoreUnavailable = false) => {
  return client.indices.delete({
    index: index,
    ignore_unavailable: ignoreUnavailable
  });
};

const updateById = async ({
  id,
  obj,
  modelName = required(),
  upsert = false
}) => {
  try {
    const elasticIndexData = elasticIndexes.find(item => item.model === modelName);

    await client.update({
      index: elasticIndexData?.name,
      id,
      body: {
        doc: removeHtmlTagsFromObject(obj, elasticIndexData?.fieldsForReturning || []),
        doc_as_upsert: upsert
      },
      retry_on_conflict: 10
    });
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
};

const getIndexes = async () => {
  const indexesData = await client.cat.indices({ format: 'json' });

  return indexesData.body.map(({ index }) => index);
};

const clearData = async (indexes) => {
  const results = await Promise.allSettled(indexes.map(index => client.deleteByQuery({
    index: index,
    body: {
      query: {
        match_all: {}
      }
    }
  })));

  return results.map((result, index) => {
    const resultData = {
      indexName: indexes[index],
      status: result.status
    };

    if (result.status === 'fulfilled') {
      resultData.deleted = result.value.body.deleted;
    }

    if (result.status === 'rejected') {
      resultData.reason = result.reason;
    }

    return resultData;
  });
};

/**
 * @param modelName {string}
 * @param items {Object[]}
 * @returns {Promise<void>}
 */
async function bulkCreate ({
  modelName,
  items
}) {
  const body = [];

  if (!items.length) {
    return;
  }

  const elasticIndexData = elasticIndexes.find(item => item.model === modelName);

  for (const item of items) {
    body.push(
      { index: { _index: elasticIndexData?.name, _id: item.id } },
      removeHtmlTagsFromObject(item, elasticIndexData?.fieldsForReturning || [])
    );
  }

  await client.bulk({ body });
}

// TODO implement handling elastic errors
module.exports = {
  search: catchAndLogError(search, []),
  multiSearch: catchAndLogError(multiSearch, []),
  updateById: catchAndLogError(updateById),
  deleteIndexes: catchAndLogError(deleteIndexes),
  getIndexes: catchAndLogError(getIndexes, []),
  clearData: catchAndLogError(clearData, []),
  bulkCreate: catchAndLogError(bulkCreate),
  getClient: () => client,
  elasticIndexes
};
