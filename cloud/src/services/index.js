const Batch = require('./batch/batch.js');
const Roles = require('./roles/roles.js');
const Aggregate = require('./aggregate/aggregate.js');
const Post = require('./post/post.js');
const Offline = require('./offline/offline.js');
const Messaging = require('./messaging/messaging');

const services = {
  batch: Batch,
  roles: Roles,
  aggregate: Aggregate,
  post: Post,
  Messaging,
  offline: Offline,
};

module.exports = services;
