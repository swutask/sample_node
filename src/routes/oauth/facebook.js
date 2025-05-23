'use strict';

const Router = require('koa-router');
const passport = require('koa-passport');
const config = require('../../config');
const { UserService } = require('../../services');
const FacebookStrategy = require('passport-facebook').Strategy;
const router = new Router({
  prefix: '/facebook'
});

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: config.proto + '://' + config.backendDomain + config.oauth.facebook.redirectUrl,
  profileFields: ['id', 'first_name', 'last_name', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await UserService.createOauthUser({
      id: profile.id,
      profile: profile,
      accessToken: accessToken,
      refreshToken: refreshToken,
      type: 'facebook'
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

router.get('/', passport.authenticate('facebook', {
  scope: ['email']
}));

router.get('/callback', async ctx => {
  return passport.authenticate('facebook', (err, user) => {
    if (err) {
      ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.failUrl);
    } else {
      ctx.state.user = user;
      ctx.redirect(config.proto + '://' + config.frontendDomain + config.oauth.successUrl);
    }
  })(ctx);
});

module.exports = router;
