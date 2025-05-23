const faker = require('faker');

const getData = (context, events, done) => {
  context.vars.email = faker.internet.email();
  context.vars.password = 'password';
  context.vars.firstName = 'firstName';
  context.vars.lastName = 'lastName';
  context.vars.bookTitle = 'bookTitle';
  context.vars.bookSubTitle = 'bookSubTitle';
  context.vars.thinkTime = 30;

  return done();
};

const afterResponseHandler = (requestParams, response, context, ee, next) => {
  if (response.body.success && response.body.token) {
    context.vars.jwt = response.body.token;
  }

  return next();
};

module.exports = {
  getData: getData,
  afterResponseHandler: afterResponseHandler
};
