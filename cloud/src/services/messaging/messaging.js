const Slack = require('./slack');
const TextEmailMessaging = require('./text-email');

const Messaging = {
  Slack,
  TextEmailMessaging,
};

module.exports = Messaging;
