const { apiClient } = require('./common/api-client');
const { faker } = require('@faker-js/faker');
const { unique } = require('./common/unique');
const { loadModels } = require('./common/db-loader');
const { SequelizeInstance } = require('test/e2e/common/db-loader');
const moment = require('moment');
const { makeClient } = require('test/e2e/common/api-client');
const errors = require('../../src/errors');
const config = require('../../src/config');

describe('/teams', () => {
  beforeAll(async () => {
    await loadModels();
  });

  describe('/register', () => {
    const registerTeamName = unique(faker.company.name());
    const registerTeamEmail = unique(faker.internet.email());
    const registerTeamPassword = faker.internet.password();

    let registerSubscriptionId;
    let registerTeamId;
    let accessToken;

    it('/ 200 -> check trial', async () => {
      const resp = await apiClient.post('/teams/register', {
        teamName: registerTeamName,
        email: registerTeamEmail,
        password: registerTeamPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      });

      accessToken = resp.data.token;
      const team = resp.data.team;
      registerTeamId = team.id;
      const subscription = await SequelizeInstance.models.subscription.findOne({
        where: {
          teamId: team.id,
          isActive: true
        },
        include: {
          model: SequelizeInstance.models.plan,
          required: true
        }
      });

      if (subscription) {
        registerSubscriptionId = subscription.id;
        const expireAtMinusSevenDays = moment(subscription.expireAt).subtract(config.trialDuration, 'days').format('MM-D-Y');
        const currentDate = moment().format('MM-D-Y');

        expect(expireAtMinusSevenDays).toBe(currentDate);
        expect(subscription.plan.name).toBe('Trial Plan');
      }

      expect(subscription).not.toBe(null);
      expect(resp.status).toBe(200);
    });

    it('403 -> trial expired', async () => {
      const apiAuthClient = makeClient({
        accessToken,
        customHeaders: {
          team: registerTeamId
        }
      });

      await SequelizeInstance.models.subscription.update({
        expireAt: moment().subtract(8, 'days').toDate()
      }, {
        where: {
          id: registerSubscriptionId
        }
      });

      const errorResponses = await Promise.all([
        // TODO
        apiAuthClient.get('/books')
      ]);

      const successResponses = await Promise.all([
        // TODO
        apiAuthClient.get('/stripe/change-payment-details')
      ]);

      errorResponses.forEach((response) => {
        expect(response.status).toBe(403);
        expect(response.data.error.code).toBe(errors.SUBSCRIPTION_EXPIRED);
      });

      successResponses.forEach((response) => {
        expect(response.status).not.toBe(403);
      });
    });
  });
});
