const { Parse } = require('parse/node');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL,
} = require('./env.config');

if (PARSE_ENV === 'staging') {
  // PASTE HERE YOUR Back4App APPLICATION ID AND YOUR JavaScript KEY
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

const cloudFunctions = {
  hello: () => Parse.Cloud
    .run('hello')
    .then((res) => res.data),
  postObjectsToClass: (postParams) => Parse.Cloud
    .run('postObjectsToClass', postParams)
    .then((response) => response),
  postObjectsToClassWithRelation: (postParams) => Parse.Cloud
    .run('postObjectsToClassWithRelation', postParams)
    .then((response) => response),
  postObjectsToAnyClassWithRelation: (postParams) => Parse.Cloud
    .run('postObjectsToAnyClassWithRelation', postParams)
    .then((response) => response),
  updateObject: (updateParams) => Parse.Cloud
    .run('updateObject', updateParams)
    .then((response) => response),
  removeObjectsinClass: (removeParams) => Parse.Cloud
    .run('removeObjectsinClass', removeParams)
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
  addUserPushToken: (params) => Parse.Cloud
    .run('addUserPushToken', params)
    .then((response) => response),
  updateUser: (params) => Parse.Cloud
    .run('updateUser', params)
    .then((response) => response),
};

module.exports = { cloudFunctions };
