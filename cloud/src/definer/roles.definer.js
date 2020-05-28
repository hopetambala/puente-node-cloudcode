/* global Parse */
/* eslint no-undef: "error" */

const services = require('../services');

Parse.Cloud.define('createAdminRole', () => {
  const service = services.roles;
  return service.createAdminRole();
});

Parse.Cloud.define('createManagerRole', () => {
  const service = services.roles;
  return service.createManagerRole();
});

Parse.Cloud.define('createContributorRole', () => {
  const service = services.roles;
  return service.createContributorRole();
});