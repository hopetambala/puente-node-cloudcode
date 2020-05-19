const Batch = require('./batch/batch.js');
const Roles = require('./roles/roles.js');

const services = {};

services.batch = Batch;
services.roles = Roles;

module.exports = services;
