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
    .then((res) => res.data)
    .catch((error) => error),
  postObjectsToClass: (post_params) => Parse.Cloud
    .run('postObjectsToClass', post_params)
    .then((response) => response)
    .catch((error) => error),
  postObjectsToClassWithRelation: (post_params) => Parse.Cloud
    .run('postObjectsToClassWithRelation', post_params)
    .then((response) => response)
    .catch((error) => error),
  postObjectsToAnyClassWithRelation: (post_params) => Parse.Cloud
    .run('postObjectsToAnyClassWithRelation', post_params)
    .then((response) => response)
    .catch((error) => error),
  updateObject: (update_params) => Parse.Cloud
    .run('updateObject', update_params)
    .then((response) => response)
    .catch((error) => error),
  removeObjectsinClass: (remove_params) => Parse.Cloud
    .run('removeObjectsinClass', remove_params)
    .then((response) => response)
    .catch((error) => error),
  genericQuery: (queryParams) => Parse.Cloud
    .run('genericQuery', queryParams)
    .then((response) => response)
    .catch((error) => error),
  basicQuery: (queryParams) => Parse.Cloud
    .run('basicQuery', queryParams)
    .then((response) => response)
    .catch((error) => error),
  geoQuery: (queryParams) => Parse.Cloud
    .run('geoQuery', queryParams)
    .then((response) => response)
    .catch((error) => error),
  signup: (params) => Parse.Cloud
    .run('signup', params)
    .then((response) => response)
    .catch((error) => error),
  signin: (params) => Parse.Cloud
    .run('signin', params)
    .then((response) => response)
    .catch((error) => error),
  signout: () => Parse.Cloud
    .run('signout')
    .then((response) => response)
    .catch((error) => error),
  forgotPassword: (params) => Parse.Cloud
    .run('forgotPassword', params)
    .then((response) => response)
    .catch((error) => error),
  currentUser: () => Parse.Cloud
    .run('currentUser')
    .then((response) => response)
    .catch((error) => error),
  createAdminRole: () => Parse.Cloud
    .run('createAdminRole')
    .then((response) => response)
    .catch((error) => error),
  createManagerRole: () => Parse.Cloud
    .run('createManagerRole')
    .then((response) => response)
    .catch((error) => error),
  createContributorRole: () => Parse.Cloud
    .run('createContributorRole')
    .then((response) => response)
    .catch((error) => error),
  queryRoles: () => Parse.Cloud
    .run('queryRoles')
    .then((response) => response)
    .catch((error) => error),
  addToRole: (params) => Parse.Cloud
    .run('addToRole', params)
    .then((response) => response)
    .catch((error) => error),
  organizationUnverified: (params) => Parse.Cloud
    .run('organizationUnverified', params)
    .then((response) => response)
    .catch((error) => error),
  organizationVerified: (params) => Parse.Cloud
    .run('organizationVerified', params)
    .then((response) => response)
    .catch((error) => error),

};

module.exports = { cloudFunctions };
