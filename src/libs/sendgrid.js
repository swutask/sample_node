'use strict';

const log = require('../log')('sendgrid');
const { required } = require('../utils');
let client = require('@sendgrid/mail');
const { Client } = require('@sendgrid/client');
const crypto = require('crypto');

let sgClient = new Client();
sgClient.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setDefaultHeader({ 'content-type': 'application/json' });

if (process.env.NODE_ENV === 'e2e') {
  client = {
    setApiKey () {},
    send () {}
  };

  sgClient = {
    request ({ url }) {
      if (url === '/v3/marketing/contacts/search/emails') {
        return [{
          body: {
            result: [{
              contact: {
                id: crypto.randomUUID()
              }
            }]
          }
        }];
      }
    }
  };
}

module.exports = {
  sendHtml: async ({
    apiKey = required(),
    to = required(),
    from = required(),
    subject = required(),
    html = required(),
    name,
    throwError = false,
    templateId,
    content
  } = {}) => {
    client.setApiKey(apiKey);
    try {
      await client.send({
        to: to,
        from: name ? {
          name: name,
          email: from
        } : from,
        subject: subject,
        html: html,
        hideWarnings: true,
        templateId,
        content
      });
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        log.error(err);
      }
    }
  },

  send: async ({
    apiKey = required(),
    to = required(),
    from = required(),
    subject = required(),
    templateId,
    text,
    params = {},
    name,
    headers = {},
    throwError = false,
    unsubscribeGroupId
  } = {}) => {
    client.setApiKey(apiKey);
    try {
      await client.send({
        to: to,
        from: name ? {
          name: name,
          email: from
        } : from,
        subject: subject,
        templateId,
        text: text,
        hideWarnings: true,
        headers,
        dynamicTemplateData: {
          subject: subject,
          ...params
        },
        asm: unsubscribeGroupId
          ? {
            groupId: unsubscribeGroupId,
            groupsToDisplay: [unsubscribeGroupId]
          } : undefined
      });
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        log.error(err);
      }
    }
  },

  addContact: async ({
    firstName = required(),
    email = required(),
    lastName,
    userName,
    listIds,
    throwError = false,
    customFields = {}
  } = {}) => {
    try {
      await sgClient.request({
        method: 'PUT',
        url: '/v3/marketing/contacts',
        body: {
          list_ids: listIds,
          contacts: [
            {
              first_name: firstName,
              last_name: lastName,
              unique_name: userName,
              email: email,
              custom_fields: customFields
            }
          ]
        }
      });
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
    listId,
    throwError = false
  } = {}) => {
    try {
      const contacts = await sgClient.request({
        method: 'POST',
        url: '/v3/marketing/contacts/search/emails',
        body: {
          emails: [email]
        }
      });

      const contactId = contacts[0].body.result[email].contact.id;

      await sgClient.request({
        method: 'DELETE',
        url: `/v3/marketing/lists/${listId}/contacts`,
        qs: {
          contact_ids: contactId
        }
      });
    } catch (err) {
      if (throwError) {
        throw err;
      } else {
        log.error(err);
      }
    }
  }
};
