'use strict';

module.exports = {
  proto: 'https',
  frontendDomain: 'stage.complex.so',
  backendDomain: 'stageapi.complex.so',
  apiPath: '/api',
  port: 3001,
  host: '0.0.0.0',
  db: {
    dialect: 'postgres'
  },
  accessLogs: true,
  saltRounds: 10,
  auth: {
    tokenLifetimeSeconds: 720 * 60 * 60, // 30days
    header: 'auth',
    passwordResetEmailTemplateId: 'd-6de3a8c2f9ef406296042a2985819063',
    passwordResetEmailMaxAge: 1000 * 60 * 60,
    passwordResetEmailSubject: 'Password',
    passwordResetEmailFrom: {
      email: 'support@complex.so',
      name: 'Complex.so'
    },
    passwordResetEmailRedirect: '/password-recover'
  },
  team: {
    header: 'team',
    codeMaxAge: 1000 * 60 * 60,
    codeVerificationEmailTemplateId: 'd-7c93e00a6cf34f2382d59f8e09505374',
    inviteMemberEmailTemplateId: 'd-41a27ce6d54f4554b7f6ccb1cd939de5',
    inviteMemberEmailRedirect: '/sign-up',
    inviteMemberEmailMaxAge: 1000 * 60 * 60 * 24, // 24h
    inviteMemberEmailSubject: 'Invite',
    emailSubject: 'Team verification',
    emailFrom: {
      email: 'support@complex.so',
      name: 'Complex.so'
    }
  },
  client: {
    inviteClientEmailTemplateId: 'd-81856eeb060245a0a2f2b1c9d455df1c',
    inviteClientEmailRedirectWithRegistration: '/sign-up',
    inviteClientEmailRedirectWithoutRegistration: '/accept-client-invite',
    inviteClientEmailSubject: 'Invite',
    emailSubject: 'Client registration',
    emailFrom: {
      email: 'support@complex.so',
      name: 'Complex.so'
    }
  },
  oauth: {
    cookieName: 'hiout',
    cookieDomain: '.complex.so',
    failUrl: '/social-auth/failed',
    successUrl: '/social-auth/success',
    calendarFailUrl: '/google-calendar?status=failed',
    calendarSuccessUrl: '/google-calendar?status=success',
    google: {
      calendarRedirectUrl: '/api/auth/oauth/google/calendar/callback',
      redirectUrl: '/api/auth/oauth/google/callback'
    },
    facebook: {
      redirectUrl: '/api/auth/oauth/facebook/callback'
    }
  },
  s3: {
    bucket: 'complex-stage-upload',
    region: 'eu-central-1'
  },
  stripe: {
    successUrl: '/payment/success',
    successTeamUrl: '/payment/success?team=true',
    cancelUrl: '/payment/failed',
    cancelTeamUrl: '/payment/failed?team=true',
    changePaymentMethod: {
      successUrl: '/payment/change/success',
      successTeamUrl: '/payment/change/success?team=true',
      cancelUrl: '/payment/change/failed',
      cancelTeamUrl: '/payment/change/failed?team=true'
    }
  },
  share: {
    emailTemplateId: 'd-37e59e0eb9624b5a9f8c3e199213fd83',
    emailFrom: 'shared@complex.so',
    emailName: 'Complex.so'
  },
  notification: {
    emailTemplateId: 'd-fe46f5e2dbeb4b7c82a0335db846f3db',
    emailFrom: 'hey@noreply.complex.so',
    emailName: 'Complex.so'
  },
  reminder: {
    emailTemplateId: 'd-e1b3765534f1476887ee683a51a54cd8',
    emailFrom: 'reminders@complex.so',
    emailName: 'Complex.so'
  },
  trialDuration: 14
};
