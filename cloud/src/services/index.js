const Batch = require('./batch/batch.js');
const Roles = require('./roles/roles.js');
const Aggregate = require('./aggregate/aggregate.js');
const Post = require('./post/post.js');

const services = {};

services.batch = Batch;
services.roles = Roles;
services.aggregate = Aggregate;
services.post = Post;

module.exports = services;
