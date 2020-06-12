const { Parse } = require('parse/node');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL,
} = require('./env.config');

if (PARSE_ENV == 'staging') {
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY); // PASTE HERE YOUR Back4App APPLICATION ID AND YOUR JavaScript KEY
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

const cloudFunctions = {
  hello: (request) => Parse.Cloud
    .run('hello')
    .then((res) => res.data),
  postObjectsToClass: (post_params) => Parse.Cloud
    .run('postObjectsToClass', post_params)
    .then((response) => response),
  postObjectsToClassWithRelation: (post_params) => Parse.Cloud
    .run('postObjectsToClassWithRelation', post_params)
    .then((response) => response),
  postObjectsToAnyClassWithRelation: (post_params) => Parse.Cloud
    .run('postObjectsToAnyClassWithRelation', post_params)
    .then((response) => response),
  updateObject: (update_params) => Parse.Cloud
    .run('updateObject', update_params)
    .then((response) => response),
  removeObjectsinClass: (remove_params) => Parse.Cloud
    .run('removeObjectsinClass', remove_params)
    .then((response) => response),
  genericQuery: (queryParams) => Parse.Cloud
    .run('genericQuery', queryParams)
    .then((response) => response),
  basicQuery: (queryParams) => Parse.Cloud
    .run('basicQuery', queryParams)
    .then((response) => response),
  geoQuery: (queryParams) => Parse.Cloud
    .run('geoQuery', queryParams)
    .then((response) => response),
  signup: (params) => Parse.Cloud
    .run('signup', params)
    .then((response) => response),
  signin: (params) => Parse.Cloud
    .run('signin', params)
    .then((response) => response),
  signout: () => Parse.Cloud
    .run('signout')
    .then((response) => response),
  forgotPassword: (params) => Parse.Cloud
    .run('forgotPassword', params)
    .then((response) => response),
  deleteUser: (params) => Parse.Cloud
    .run('deleteUser', params)
    .then((response) => response),
  createAdminRole: () => Parse.Cloud
    .run('createAdminRole')
    .then((response) => response),
  createManagerRole: () => Parse.Cloud
    .run('createManagerRole')
    .then((response) => response),
  createContributorRole: () => Parse.Cloud
    .run('createContributorRole')
    .then((response) => response),
  queryRoles: () => Parse.Cloud
    .run('queryRoles')
    .then((response) => response),
  addToRole: (params) => Parse.Cloud
    .run('addToRole', params)
    .then((response) => response),
  organizationUnverified: (params) => Parse.Cloud
    .run('organizationUnverified', params)
    .then((response) => response),
  organizationVerified: (params) => Parse.Cloud
    .run('organizationVerified', params)
    .then((response) => response),
};

module.exports = { cloudFunctions };
