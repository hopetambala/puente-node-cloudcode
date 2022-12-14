const { WebClient, ErrorCode } = require('@slack/web-api');

const { SLACK_TOKEN: token } = process.env;
const web = new WebClient(token);

const Slack = {
  sendMessage: async function sendMessage(channel, text) {
    const { PUENTE_ENV, SLACK_DEV_CHANNEL, SLACK_PROD_CHANNEL } = process.env;

    const channelFactory = {
      'platform-alerts': PUENTE_ENV === 'prod' ? SLACK_PROD_CHANNEL : SLACK_DEV_CHANNEL,
    };


    try {
      return web.chat.postMessage({
        text,
        channel: channelFactory[channel],
      });
    } catch (err) {
      if (err.code === ErrorCode.PlatformError) {
        console.error(err.data); //eslint-disable-line
        return err;
      }
      console.error('Error: Slack sendMessage',err); //eslint-disable-line
      return err;
    }
  },
};

module.exports = Slack;
