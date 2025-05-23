const { Op } = require('sequelize');

/**
 * @param columnName {startDate}
 * @param startDate {Date}
 * @param endDate {Date}
 * @return {Object}
 */
function makeRangeCondition (columnName, startDate, endDate) {
  const startDateCondition = {
    [columnName]: {
      [Op.gte]: startDate
    }
  };
  const endDateCondition = {
    [columnName]: {
      [Op.lte]: endDate
    }
  };

  switch (true) {
    case Boolean(startDate) && Boolean(endDate): {
      return {
        [Op.and]: [
          startDateCondition,
          endDateCondition
        ]
      };
    }

    case Boolean(startDate): {
      return startDateCondition;
    }

    case Boolean(endDate): {
      return startDateCondition;
    }

    default: {
      return {};
    }
  }
}

/**
 * @param data {{
 *   [p: string]: string
 * }}
 * @param orderNameTableMap {{
 *   [p:string]: string[]
 * }}
 * @return {(string[])[]}
 */
function makeOrdersCondition (data, orderNameTableMap) {
  return Object.entries(data).reduce((acc, [orderKey, orderType]) => {
    if (!orderType) {
      return acc;
    }

    const columnAndModelMatch = orderKey.match(/(.*)Order/);

    if (!columnAndModelMatch) {
      return acc;
    }

    const orderString = `${orderType} NULLS LAST`;

    const [_, column] = columnAndModelMatch;
    acc.push([...(orderNameTableMap[orderKey] || []), column, orderString]);

    return acc;
  }, []);
}

module.exports = {
  makeRangeCondition,
  makeOrdersCondition
};
