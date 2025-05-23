'use strict';
const models = require('../models');
const { google } = require('googleapis');
const { required } = require('../utils');
const config = require('../config');
const uuid = require('uuid');
const TaskRepo = require('../repos/TaskRepo');
const TaskService = require('./TaskService');
const { sequelize } = require('../loaders/sequelize');
// const TeamMemberRepo = require('../repos/TeamMemberRepo');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { rrulestr } = require('rrule');
// const { validateRecurringRule } = require('../libs/rrule');

class GoogleCalendarService {
  /**
   * @param date {string | undefined}
   * @param dateTime {string | undefined}
   * @return {Date}
   */
  // TODO move to libs/google-calendar
  static getDateFromAttributes (date, dateTime, timeZone = 'UTC') {
    if (date) {
      return moment.tz(date, timeZone).format('YYYY-MM-DD');
    } else if (dateTime) {
      return moment.tz(dateTime, timeZone).format('YYYY-MM-DD');
    }

    return moment().tz(timeZone).format('YYYY-MM-DD');
  }

  static formatTime (dateTime, timeZone) {
    if (!dateTime || !timeZone) {
      return;
    }

    const time = moment.tz(dateTime, timeZone);

    if (!time.isValid()) {
      return;
    }

    return time.format('HH:mm');
  }

  static async googleCalendarAuth ({
    userId = required(),
    teamId = null
  } = {}) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_AUTH_KEY,
      process.env.GOOGLE_CALENDAR_AUTH_SECRET,
      config.proto + '://' + config.backendDomain + config.oauth.google.calendarRedirectUrl
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.calendars',
        'https://www.googleapis.com/auth/calendar.calendarlist',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.events.owned'
      ],
      state: `${userId}-${teamId}`
    });

    return { url: url };
  }

  static async isSyncedGoogleCalendar ({
    userId = required()
  } = {}) {
    const googleCalendarUser = await models.googleCalendarUser.findOne({
      where: {
        userId: userId
      }
    });

    return {
      active: googleCalendarUser?.active,
      allowSendToGoogle: googleCalendarUser?.addToGoogle
    };
  }

  static async googleCalendars ({
    userId = required()
  } = {}) {
    const taskList = await models.task.findAll({
      where: {
        userId: userId,
        [Op.or]: [
          { calendar_id: { [Op.not]: 'complex-calendar' } },
          { calendar_id: { [Op.is]: null } }
        ]
      },
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('calendar_id')), 'calendarId']
      ]
    });
    const distinctEventTypes = taskList.map(task => task.get('calendarId'));

    return distinctEventTypes;
  }

  static async updateGoogleCalendarUser ({
    userId = required(),
    allowSendToGoogle = required()
  } = {}) {
    await models.googleCalendarUser.update(
      {
        addToGoogle: allowSendToGoogle
      },
      {
        where: {
          userId: userId
        }
      }
    );
  }

  static async createCalendarUser ({
    code = required(),
    userId = required(),
    teamId = null
  } = {}) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_AUTH_KEY,
      process.env.GOOGLE_CALENDAR_AUTH_SECRET,
      config.proto + '://' + config.backendDomain + config.oauth.google.calendarRedirectUrl
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const peopleApi = google.people({ version: 'v1', auth: oauth2Client });
    const { data: profile } = await peopleApi.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses'
    });

    const email = profile.emailAddresses[0]?.value;

    if (!email) {
      return;
    }

    const user = await models.user.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const googleCalendarUser = await models.googleCalendarUser.findOne({
      where: {
        userId
      }
    });

    // If user use one google account for many accounts in the app

    if (!tokens.refresh_token) {
      const existingUser = await models.googleCalendarUser.findOne({
        where: {
          email
        }
      });
      tokens.refresh_token = existingUser?.refreshToken;
    }

    if (!googleCalendarUser) {
      await models.googleCalendarUser.create({
        email: email,
        userId: userId,
        active: true,
        addToGoogle: false,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      });
    } else {
      if (!tokens.refresh_token) {
        tokens.refresh_token = googleCalendarUser.refreshToken;
      }
      await models.googleCalendarUser.update(
        {
          active: true,
          email: email,
          addToGoogle: false,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token
        },
        {
          where: {
            userId
          }
        }
      );
    }

    await this.syncGoogleCalendar({
      userId,
      teamId
    });

    return user;
  }

  static async parseWebhook ({
    userId,
    teamId = null,
    channelId,
    resourceId
  } = {}) {
    const googleCalendarUser = await models.googleCalendarUser.findOne({
      where: {
        userId
      }
    });

    if (!googleCalendarUser?.active) {
      return;
    }

    if (googleCalendarUser?.channelId !== channelId || googleCalendarUser?.resourceId !== resourceId) {
      await models.googleCalendarUser.update({
        channelId,
        resourceId
      }, {
        where: {
          userId
        }
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_AUTH_KEY,
      process.env.GOOGLE_CALENDAR_AUTH_SECRET
    );

    const tokens = {
      refresh_token: googleCalendarUser.refreshToken
    };

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarListResponse = await calendar.calendarList.list();

    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);

    await Promise.all(
      calendarListResponse.data.items.map(async (item) => {
        const calendarIdd = item.id;
        const summary = item.summary;
        const timeZone = item.timeZone;

        const response = await calendar.events.list({
          calendarId: calendarIdd,
          singleEvents: false,
          maxResults: 2500,
          orderBy: 'updated',
          updatedMin: now.toISOString()
        });

        const responseEvents = response.data.items;

        for (const responseEvent of responseEvents) {
          const task = await TaskRepo.getByExternalId(responseEvent.recurringEventId || responseEvent.id);
          let event = responseEvent;

          if (responseEvent.recurringEventId) {
            const eventResponse = await calendar.events.get({
              eventId: responseEvent.recurringEventId,
              calendarId: calendarIdd
            });
            event = eventResponse.data;
          }

          const calendarSpace = await models.book.findOne({
            where: {
              userId,
              isCalendar: true
            }
          });

          if (!calendarSpace) {
            throw new Error('Google calendar is not defined');
          }

          const startDate = this.getDateFromAttributes(event.start?.date, event.start?.dateTime, timeZone);
          const checkDate = this.getDateFromAttributes(event.end?.date, event.end?.dateTime, timeZone);
          let endDate = startDate === checkDate ? checkDate : null;
          if (endDate === null) {
            const dateString = event.end?.date || event.end?.dateTime;
            if (dateString) {
              const date = new Date(dateString);
              date.setDate(date.getDate() - 1);
              endDate = this.getDateFromAttributes(date);
            }
          }

          const startEventTime = this.formatTime(event.start?.dateTime || event.start?.date, event.start?.timeZone);
          const endEventTime = this.formatTime(event.end?.dateTime || event.end?.date, event.end?.timeZone);
          const eventType = event.creator?.email.includes('holiday') ? 'holiday' : event.eventType;
          let userName;
          if (summary.includes('@gmail.com')) {
            const people = google.people({ version: 'v1', auth: oauth2Client });

            try {
              const peopleResponse = await people.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses'
              });
              userName = peopleResponse.data.names?.[0]?.displayName;
            } catch (error) {
            }
          }
          const calendarId = event.eventType === 'birthday' ? 'Birthdays' : (userName || summary);

          if (!task && responseEvent.summary) {
            let rrule = null;

            if (event.recurrence) {
              rrule = this.parseRrule(event.recurrence);
            }

            await TaskService.createByExternalResource({
              teamId,
              userId,
              startDate,
              endDate,
              title: event.summary,
              externalId: event.id,
              additionalInfo: event.description,
              integrationType: 'google',
              htmlLink: event.htmlLink,
              startEventTime,
              endEventTime,
              eventType,
              calendarId,
              bookId: calendarSpace.id,
              rrule
            });
          } else if (responseEvent.status === 'cancelled' && task) {
            if (responseEvent.recurringEventId) {
              const rruleSet = rrulestr(event.recurrence.join('\n'), {
                forceset: true
              });

              const extDate = this.getDateFromAttributes(responseEvent.originalStartTime.date, responseEvent.originalStartTime.dateTime);

              if (!rruleSet.after(extDate, true)) {
                continue;
              }

              rruleSet.exdate(extDate);
              await TaskService.updateByExternalResource({
                userId,
                teamId,
                id: task.id,
                bookId: task.bookId,
                startDate,
                endDate,
                rrule: rruleSet.toString()
              });

              continue;
            }

            await TaskService.deleteByExternalResource({
              userId,
              teamId,
              externalId: event.id,
              id: task.id,
              bookId: calendarSpace.id,
              parentId: task.parentId
            });
          } else if (task && responseEvent.summary && !responseEvent.recurringEventId) {
            let rrule = null;

            if (event.recurrence) {
              rrule = this.parseRrule(event.recurrence);
            }

            await TaskService.updateByExternalResource({
              userId,
              teamId,
              startDate,
              endDate,
              id: task.id,
              bookId: task.bookId,
              externalId: responseEvent.id,
              subTitle: responseEvent.description,
              title: responseEvent.summary,
              rrule
            });
          }
        }
      })
    );
  }

  static async disableGoogleCalendar ({
    userId = required()
  } = {}) {
    const googleCalendarUser = await models.googleCalendarUser.findOne({
      where: {
        userId: userId
      }
    });

    if (!googleCalendarUser) {
      throw new Error('Google Calendar not synced');
    }

    await googleCalendarUser.update({
      active: false
    });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_AUTH_KEY,
      process.env.GOOGLE_CALENDAR_AUTH_SECRET
    );

    const tokens = {
      refresh_token: googleCalendarUser.refreshToken
    };
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (googleCalendarUser.channelId && googleCalendarUser.resourceId) {
      return calendar.channels.stop({
        resource: {
          id: googleCalendarUser.channelId,
          resourceId: googleCalendarUser.resourceId
        }
      });
    }
  }

  /**
   * @param recurrence {string[]}
   * @return {string | null}
   */
  static parseRrule (recurrence) {
    const rruleString = recurrence.join('\n');
    try {
      return rrulestr(rruleString).toString();
    } catch (e) {
      return null;
    }
  }

  static async syncGoogleCalendar ({
    userId = required(),
    teamId = required()
  } = {}) {
    const googleCalendarUser = await models.googleCalendarUser.findOne({
      where: {
        userId
      }
    });

    if (!googleCalendarUser?.active) {
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_AUTH_KEY,
      process.env.GOOGLE_CALENDAR_AUTH_SECRET
    );

    const SCOPES = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.calendars',
      'https://www.googleapis.com/auth/calendar.calendarlist',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.events.owned',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'

    ];

    const tokens = {
      refresh_token: googleCalendarUser.refreshToken
    };

    oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarListResponse = await calendar.calendarList.list();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const plusYear = new Date();
    plusYear.setFullYear(plusYear.getFullYear() + 1);

    const calendarSpace = await models.book.findOne({
      where: {
        userId,
        isCalendar: true
      }
    });

    if (!calendarSpace) {
      throw new Error('Google calendar is not defined');
    }

    const calendarIds = [];

    await Promise.all(
      calendarListResponse.data.items.map(async (item) => {
        const calendarId = item.id;
        const summary = item.summary;
        const timeZone = item.timeZone;
        calendarIds.push(calendarId);

        const response = await calendar.events.list({
          calendarId: calendarId,
          maxResults: 2500,
          singleEvents: false,
          timeMin: yesterday.toISOString(),
          timeMax: plusYear.toISOString()
        });

        const items = response.data.items;

        for (const ev of items) {
          const existTask = await TaskRepo.getByExternalId(ev.recurringEventId || ev.id);

          if (existTask) {
            continue;
          }

          const startDate = this.getDateFromAttributes(ev.start?.date, ev.start?.dateTime, timeZone);
          const checkDate = this.getDateFromAttributes(ev.end?.date, ev.end?.dateTime, timeZone);

          let rrule = null;

          if (ev.recurrence) {
            if (ev.recurrence?.length > 0) {
              ev.recurrence.push(`DTSTART:${moment(startDate).format('YYYYMMDDTHHmmss[Z]')}`);
            }
            rrule = this.parseRrule(ev.recurrence);
          }

          let endDate = startDate === checkDate ? checkDate : null;
          if (endDate === null) {
            const dateString = ev.end?.date || ev.end?.dateTime;
            if (dateString) {
              const date = new Date(dateString);
              date.setDate(date.getDate() - 1);
              endDate = this.getDateFromAttributes(date);
            }
          }
          const startEventTime = this.formatTime(ev.start?.dateTime || ev.start?.date, ev.start?.timeZone);
          const endEventTime = this.formatTime(ev.end?.dateTime || ev.end?.date, ev.end?.timeZone);
          const eventType = ev.creator?.email.includes('holiday') ? 'holiday' : ev.eventType;
          let userName;
          if (summary.includes('@gmail.com')) {
            const people = google.people({ version: 'v1', auth: oauth2Client });
            try {
              const peopleResponse = await people.people.get({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses'
              });

              userName = peopleResponse.data.names?.[0]?.displayName;
            } catch (error) {
            }
          }
          const calendarId = ev.eventType === 'birthday' ? 'Birthdays' : (userName || summary);

          await TaskService.createByExternalResource({
            title: ev.summary,
            additionalInfo: ev.description,
            externalId: ev.id,
            integrationType: 'google',
            htmlLink: ev.htmlLink,
            startDate,
            endDate,
            startEventTime,
            endEventTime,
            eventType,
            userId,
            teamId,
            bookId: calendarSpace.id,
            calendarId,
            rrule
          });
        }
      })
    );
    const filteredCalendarIds = calendarIds.filter((id) => !id.includes('holiday'));
    await Promise.all(
      filteredCalendarIds.map(async (calendarId) => {
        const watchResponse = await calendar.events.watch({
          calendarId: calendarId,
          requestBody: {
            id: uuid.v4(),
            type: 'web_hook',
            address: config.proto + '://' + config.backendDomain + `/api/google-calendar/calendar/webhook/v3/${userId}/${teamId}/unused`
          }
        });
        await models.googleCalendarUser.update({
          resourceId: watchResponse.data.resourceId,
          channelId: watchResponse.data.id
        }, {
          where: {
            userId
          }
        });
      })
    );
  }
}

module.exports = GoogleCalendarService;
