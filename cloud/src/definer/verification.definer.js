/* global Parse */
/* eslint no-undef: "error" */

Parse.Cloud.define('organizationUnverified', (request, response) => new Promise((resolve, reject) => {
  // const User = Parse.Object.extend(Parse.User);
  const userQuery = new Parse.Query(Parse.User);
  // find if there is a current user associated with organization
  userQuery.equalTo('organization', String(request.params.organization));
  userQuery.equalTo('adminVerified', false);
  userQuery.find().then((results) => {
    response.success(resolve(results));
  }, (error) => {
    response.error(reject(error));
  });
}));

Parse.Cloud.define('organizationVerified', (request, response) => new Promise((resolve, reject) => {
  // const User = Parse.Object.extend(Parse.User);
  const userQuery = new Parse.Query(Parse.User);
  // find if there is a current user associated with organization
  userQuery.equalTo('organization', String(request.params.organization));
  userQuery.equalTo('adminVerified', true);
  userQuery.find().then((results) => {
    response.success(resolve(results));
  }, (error) => {
    response.error(reject(error));
  });
}));

Parse.Cloud.define('queryRoles', (request, response) => new Promise((resolve, reject) => {
  // return new Promise((resolve, reject) => {
  const Role = Parse.Object.extend('_Role');
  const queryRole = new Parse.Query(Role);

  queryRole.find().then((result) => {
    // console.log(result);
    response.success(resolve(result));
  }, (error) => {
    response.error(reject(error));
  });
  // })
}));
