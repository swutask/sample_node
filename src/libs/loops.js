'use strict';

const log = require('../log')('loops');
const { required } = require('../utils');
const { LoopsClient } = require('loops');

const loops = new LoopsClient(process.env.LOOPS_API_KEY);

module.exports = {
  addContact: async ({
    firstName = required(),
    email = required(),
    lastName,
    userName,
    teamName,
    userGroup,
    throwError = false
  } = {}) => {
    try {
      const contactProperties = {
        firstName,
        lastName,
        userName,
        userGroup,
        teamName
      };
      const contact = await loops.findContact({ email });

      if (contact.length) {
        // remove contact from loop and add contact again with correct group to enable email loop
        await loops.deleteContact({ email });
      }

      await loops.createContact(email, contactProperties);
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        log.error(err);
      }
    }
  },

  deleteContact: async ({
    email = required(),
    throwError = false
  } = {}) => {
    try {
      await loops.deleteContact({ email });
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        log.error(err);
      }
    }
  }
};
