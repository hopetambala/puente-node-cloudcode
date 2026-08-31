const { Parse } = require('parse/node');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL, PARSE_MASTER_KEY,
} = require('./env.config');

if (PARSE_ENV === 'staging') {
  // PASTE HERE YOUR Back4App APPLICATION ID AND YOUR JavaScript KEY
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

// Node only. createOrganization is a privileged operation, so the harness
// needs a key for it; every other call below stays unprivileged.
Parse.masterKey = PARSE_MASTER_KEY;

const cloudFunctions = {
  // Deliberately WITHOUT the master key - proves the guard on createOrganization.
  createOrganizationUnprivileged: (params) => Parse.Cloud
    .run('createOrganization', params),
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
  myOrganizationAccessAsSession: (params, sessionToken) => Parse.Cloud
    .run('myOrganizationAccess', params, { sessionToken }),
  myOrganizationAccess: (params) => Parse.Cloud
    .run('myOrganizationAccess', params),
  planOrgAdminSeed: (params) => Parse.Cloud
    .run('planOrgAdminSeed', params, { useMasterKey: true }),
  planOrgAdminSeedUnprivileged: (params) => Parse.Cloud
    .run('planOrgAdminSeed', params),
  applyOrgAdminSeed: (params) => Parse.Cloud
    .run('applyOrgAdminSeed', params, { useMasterKey: true }),
  listOrganizationMembers: (params) => Parse.Cloud
    .run('listOrganizationMembers', params, { useMasterKey: true }),
  listOrganizationMembersUnprivileged: (params) => Parse.Cloud
    .run('listOrganizationMembers', params),
  setOrgAdmin: (params) => Parse.Cloud
    .run('setOrgAdmin', params, { useMasterKey: true }),
  setOrgAdminAsSession: (params, sessionToken) => Parse.Cloud
    .run('setOrgAdmin', params, { sessionToken }),
  setOrgAdminUnprivileged: (params) => Parse.Cloud
    .run('setOrgAdmin', params),
  setUserActive: (params) => Parse.Cloud
    .run('setUserActive', params, { useMasterKey: true })
    .then((response) => response),
  setUserActiveAsSession: (params, sessionToken) => Parse.Cloud
    .run('setUserActive', params, { sessionToken }),
  setUserActiveUnprivileged: (params) => Parse.Cloud
    .run('setUserActive', params),
  listInvoices: (params) => Parse.Cloud.run('listInvoices', params),
  listInvoicesPrivileged: (params) => Parse.Cloud
    .run('listInvoices', params, { useMasterKey: true }),
  mirrorInvoice: (params) => Parse.Cloud.run('mirrorInvoice', params),
  mirrorInvoicePrivileged: (params) => Parse.Cloud
    .run('mirrorInvoice', params, { useMasterKey: true }),
  setOrganizationBilling: (params) => Parse.Cloud.run('setOrganizationBilling', params),
  getOrganizationBilling: (params) => Parse.Cloud
    .run('getOrganizationBilling', params, { useMasterKey: true }),
  setOrganizationBillingPrivileged: (params) => Parse.Cloud
    .run('setOrganizationBilling', params, { useMasterKey: true }),
  organizationUsage: (params) => Parse.Cloud.run('organizationUsage', params),
  organizationUsagePrivileged: (params) => Parse.Cloud
    .run('organizationUsage', params, { useMasterKey: true }),
  getRateCard: (params) => Parse.Cloud.run('getRateCard', params),
  updateRateCard: (params) => Parse.Cloud.run('updateRateCard', params),
  updateRateCardPrivileged: (params) => Parse.Cloud
    .run('updateRateCard', params, { useMasterKey: true }),
  seedPuenteStaff: (params) => Parse.Cloud
    .run('seedPuenteStaff', params, { useMasterKey: true }),
  seedPuenteStaffUnprivileged: (params) => Parse.Cloud
    .run('seedPuenteStaff', params),
  lockLegacyRoleAcls: (params) => Parse.Cloud
    .run('lockLegacyRoleAcls', params, { useMasterKey: true }),
  lockLegacyRoleAclsUnprivileged: (params) => Parse.Cloud
    .run('lockLegacyRoleAcls', params),
  addToRolePrivileged: (params) => Parse.Cloud
    .run('addToRole', params, { useMasterKey: true })
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
  uploadOfflineForms: (params) => Parse.Cloud
    .run('uploadOfflineForms', params)
    .then((response) => response),
  resolveOrganization: (params) => Parse.Cloud
    .run('resolveOrganization', params)
    .then((response) => response),
  editOrganizationAliases: (params) => Parse.Cloud
    .run('editOrganizationAliases', params, { useMasterKey: true }),
  editOrganizationAliasesUnprivileged: (params) => Parse.Cloud
    .run('editOrganizationAliases', params),
  createOrganization: (params) => Parse.Cloud
    .run('createOrganization', params, { useMasterKey: true })
    .then((response) => response),
};

module.exports = { cloudFunctions };
