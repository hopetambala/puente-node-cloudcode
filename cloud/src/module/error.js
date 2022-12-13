const services = require('../services');

const { PARSE_ENV } = process.env;

const Error = {
  logError: function logError(error) {
    console.error(error); //eslint-disable-line
    if (PARSE_ENV !== 'dev') return services.Messaging.Slack.sendMessage('platform-alerts', error);
    return error;
  },
};

module.exports = Error;
