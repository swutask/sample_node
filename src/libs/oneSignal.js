const OneSignal = require('@onesignal/node-onesignal');

const configuration = OneSignal.createConfiguration({
  appKey: process.env.ONE_SIGNAL_APP_KEY,
  userKey: process.env.ONE_SIGNAL_USER_KEY
});
const client = new OneSignal.DefaultApi(configuration);

/**
 * @param userId {number}
 * @param name {string}
 * @param content {string}
 * @param url {string}
 * @param options {{
 *   appId: string
 * }}
 * @return {Promise<string | undefined>}
 */
async function sendMessage ({
  userId,
  name,
  content,
  url
}, options = {
  appId: process.env.ONE_SIGNAL_APP_ID,
  templateId: process.env.ONE_SIGNAL_TEMPLATE_ID
}) {
  const notification = new OneSignal.Notification();
  notification.app_id = options.appId;
  notification.name = name;
  notification.contents = {
    en: content
  };
  notification.include_external_user_ids = [userId.toString()];
  notification.url = url;
  notification.template_id = options.templateId;

  const notificationResponse = await client.createNotification(notification);

  return notificationResponse.id;
}

module.exports = {
  sendMessage
};
