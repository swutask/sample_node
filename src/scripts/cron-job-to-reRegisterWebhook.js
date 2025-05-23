'use strict';

require('../utils').dotEnv();
const { sequelize } = require('../loaders');
const models = require('../models');
const { google } = require('googleapis');
const { Op } = require('sequelize');
const uuid = require('uuid');
const config = require('../config');

(async () => {
  await sequelize.loadModels();

  try {
    let count = 100;
    const limit = 100;
    let offset = 0;

    console.time('all');

    while (count === limit) {
      console.time(`time-${offset}`);

      await sequelize.sequelize.transaction(async () => {
        // Fetch users whose webhook subscriptions are outdated
        const users = await models.googleCalendarUser.findAll({
          where: {
            active: true,
            updated_at: {
              [Op.lt]: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) // 29 days ago
            }
          },
          attributes: ['id', 'email', 'refresh_token'],
          raw: true,
          limit,
          offset
        });

        if (users.length === 0) {
          count = 0;
          return;
        }

        for (const user of users) {
          if (!user.refresh_token) continue;

          // Fetch user's Google Calendar IDs
          const eventCalendarIds = await models.task.findAll({
            where: {
              integrationType: 'google',
              userId: user.id,
              eventCalendarId: { [Op.ne]: null }
            },
            attributes: [
              [sequelize.fn('DISTINCT', sequelize.col('event_calendar_id')), 'eventCalendarId'],
              'team_id'
            ],
            raw: true
          });

          if (eventCalendarIds.length === 0) continue;

          const calendarIds = eventCalendarIds.map((row) => row.eventCalendarId);
          const filteredCalendarIds = calendarIds.filter((id) => !id.includes('holiday'));

          const teamId = eventCalendarIds[0]?.team_id;

          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CALENDAR_AUTH_KEY,
            process.env.GOOGLE_CALENDAR_AUTH_SECRET
          );

          oauth2Client.setCredentials({ refresh_token: user.refresh_token });

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

          for (const calendarId of filteredCalendarIds) {
            const watchResponse = await calendar.events.watch({
              calendarId,
              requestBody: {
                id: uuid.v4(),
                type: 'web_hook',
                address: `${config.proto}://${config.backendDomain}/api/google-calendar/calendar/webhook/v3/${user.id}/${teamId}/unused`,
                params: { ttl: 2592000 }
              }
            });

            await models.googleCalendarUser.update(
              {
                resourceId: watchResponse.data.resourceId,
                channelId: watchResponse.data.id
              },
              { where: { id: user.id } }
            );
          }
        }

        console.timeEnd(`time-${offset}`);
        count = users.length;
        offset += limit;
      });
    }

    console.timeEnd('all');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await sequelize.sequelize.close();
  }
})();
