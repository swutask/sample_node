'use strict';

require('../utils').dotEnv();
const { Op } = require('sequelize');
const { sequelize } = require('../loaders');
const models = require('../models');

(async _ => {
  await sequelize.loadModels();

  const userFiltersCount = await models.filter.update({
    task: '{"showCompletedFilter":{"label":"None","val":3},"search":"","membersFilter":null, "selectedBooksFilter": null,"tagsFilter":[],"urgencyFilter":[],"dateFilter":[],"showOnTask":[{"name":"Labels","key":"labels","width":56.45,"selected":true},{"name":"Assignee","key":"assignee","width":70.47,"selected":true},{"name":"Priority","key":"priority","width":59.92,"selected":true},{"name":"Due date","key":"dueDate","width":73,"selected":true},{"name":"Comments","key":"comments","width":79.08,"selected":true},{"name":"Attachments","key":"attachments","width":89.28,"selected":false,"isHidden":true},{"name":"Description","key":"description","width":82,"selected":false,"isHidden":true},{"name":"Subtitle","key":"subtitle","width":62.75,"selected":true},{"name":"Image","key":"image","width":52.52,"selected":true},{"name":"Estimate","key":"storyPoints","width":66,"selected":true}],"sortedBy":"Due date","groupBy":"Date"}'
  }, {
    where: {
      bookId: null,
      userId: {
        [Op.not]: null
      }
    }
  });

  console.log({ userFiltersCount });

  const bookFiltersCount = await models.filter.update({
    task: '{"showCompletedFilter":{"label":"All","val":0},"search":"","membersFilter":null,"tagsFilter":[],"urgencyFilter":[],"dateFilter":[],"showOnTask":[{"name":"Labels","key":"labels","width":56.45,"selected":true},{"name":"Assignee","key":"assignee","width":70.47,"selected":true},{"name":"Priority","key":"priority","width":59.92,"selected":true},{"name":"Due date","key":"dueDate","width":73,"selected":true},{"name":"Comments","key":"comments","width":79.08,"selected":true},{"name":"Attachments","key":"attachments","width":89.28,"selected":false,"isHidden":true},{"name":"Description","key":"description","width":82,"selected":false,"isHidden":true},{"name":"Subtitle","key":"subtitle","width":62.75,"selected":true},{"name":"Image","key":"image","width":52.52,"selected":true},{"name":"Estimate","key":"storyPoints","width":66,"selected":true}],"sortedBy":"Manual","groupBy":"Status"}'
  }, {
    where: {
      userId: null,
      bookId: {
        [Op.not]: null
      },
      task: null
    }
  });

  console.log({ bookFiltersCount });

  await sequelize.sequelize.close();
})();
