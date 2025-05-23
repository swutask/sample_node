const { required } = require('../utils');
const models = require('../models');

class FeatureFlagRepo {
  static async getAllFF () {
    return models.featureFlag.findAll({
      order: [['id', 'asc']]
    });
  }

  /**
   * @param name {string}
   * @param active {boolean}
   * @return {Promise<*>}
   */
  static async createFF ({
    name = required(),
    active
  } = {}) {
    const key = name.replace(/ /g, '_').toLowerCase();

    const ff = await models.featureFlag.create({
      name,
      key,
      active
    });

    return ff.get();
  }

  /**
   * @param id {number}
   * @param active {boolean}
   * @return {Promise<*|null>}
   */
  static async updateFF ({
    id = required(),
    active = required()
  }) {
    const count = await models.featureFlag.update({
      active
    }, {
      where: {
        id
      }
    });

    return Boolean(count);
  }

  /**
   * @param id {number}
   * @return {Promise<*|null>}
   */
  static async deleteFF (id = required()) {
    const count = await models.featureFlag.destroy({
      where: {
        id
      },
      force: true
    });

    return Boolean(count);
  }
}

module.exports = FeatureFlagRepo;
