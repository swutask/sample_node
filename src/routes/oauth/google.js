'use strict';

const Router = require('koa-router');
const passport = require('koa-passport');
const config = require('../../config');
const { jwtAuth, team } = require('../../middlewares');
const compose = require('koa-compose');
const { UserService, GoogleCalendarService } = require('../../services');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

const router = new Router({
  prefix: '/google'
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_AUTH_KEY,
  clientSecret: process.env.GOOGLE_AUTH_SECRET,
  callbackURL: config.proto + '://' + config.backendDomain + config.oauth.google.redirectUrl,
  passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {
  try {
    const user = await UserService.createOauthUser({
      id: profile.id,
      profile: profile,
      accessToken: accessToken,
      refreshToken: refreshToken,
      type: 'google'
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

router.get('/', passport.authenticate('google', {
  accessType: 'offline',
  prompt: 'consent',
  scope: ['email', 'profile']
}));

router.get('/callback', async ctx => {
  return passport.authenticate('google', (err, user) => {
    if (err) {
      ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.failUrl);
    } else {
      ctx.state.user = user;
      ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.successUrl);
    }
  })(ctx);
});

router.get('/calendar', compose([jwtAuth(), team()]), async ctx => {
  try {
    const url = await GoogleCalendarService.googleCalendarAuth({
      userId: ctx.state.user.id,
      teamId: ctx.state.team?.id
    });

    ctx.ok(url);
  } catch (err) {
    ctx.bad(400, err, { code: err.code ?? 0 });
  }
});

router.get('/calendar/callback', async ctx => {
  const { code } = ctx.query;
  const [userId, teamId] = ctx.query.state.split('-');

  try {
    await GoogleCalendarService.createCalendarUser({
      code,
      userId,
      teamId
    });
    console.log('/calendar/callback success');
    ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.calendarSuccessUrl);
  } catch (err) {
    console.log('err', err);
    ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.calendarFailUrl);
  }
});

module.exports = router;
