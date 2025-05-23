'use strict';

require('../utils').dotEnv();

const { elasticsearch } = require('../libs/index');

async function main () {
  const indexes = elasticsearch.elasticIndexes.map(item => item.name);

  const clearDataResult = await elasticsearch.clearData(indexes);
  console.log(clearDataResult);
  await elasticsearch.deleteIndexes(indexes, true);
}

main();
