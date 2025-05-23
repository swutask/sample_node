const { required } = require('../utils');
const FeatureFlagRepo = require('../repos/FeatureFlagRepo');

class FeatureFlagsService {
  /**
    * @return {Promise<Array<unknown>>}
  */
  static async get () {
    return FeatureFlagRepo.getAllFF();
  }

  /**
    * @param data {{
    *   name: string,
    *   active: boolean
    * }}
    * @return {Promise<*>}
  */
  static async create (data = required()) {
    return FeatureFlagRepo.createFF(data);
  }

  /**
    * @param data {{
    *   id: number,
    *   active: boolean
    * }}
    * @return {Promise<*|null>}
  */
  static async update (data = required()) {
    return FeatureFlagRepo.updateFF(data);
  }

  /**
    * @param id {number}
    * @return {Promise<*|null>}
  */
  static async delete (id = required()) {
    return FeatureFlagRepo.deleteFF(id);
  }
}

module.exports = FeatureFlagsService;
