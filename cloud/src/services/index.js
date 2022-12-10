const Batch = require('./batch/batch.js');
const Roles = require('./roles/roles.js');
const Aggregate = require('./aggregate/aggregate.js');
const Post = require('./post/post.js');
const Messaging = require('./messaging/messaging.js');
const Offline = require('./offline/offline.js');
const Logging = require('./logging/logging');

const services = {
  Logging,
  batch: Batch,
  roles: Roles,
  aggregate: Aggregate,
  post: Post,
  messaging: Messaging,
  offline: Offline,
};

module.exports = services;
