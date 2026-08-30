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

/**
 * Creates the cross-organization `puente_staff` role.
 *
 * Master-key only, and deliberately so: membership in this role is what gates
 * organization administration, so an endpoint that let a session grant it would
 * BE the escalation path. Staff are seeded by a master-key script, by hand.
 */
Parse.Cloud.define('createPuenteStaffRole', async (request) => {
  if (!request.master) {
    throw new Error('createPuenteStaffRole requires the master key');
  }
  return services.roles.createStaffRole();
});

/**
 * Does the calling session belong to `puente_staff`?
 *
 * Manage needs this for nav visibility and its route guard. It exists as a
 * Cloud function because the role is NOT publicly readable — a browser querying
 * `_Role` directly would get nothing back and every staff member would render
 * as non-staff.
 *
 * This is a UX affordance, not the security boundary. The boundary is the
 * server-side check inside each privileged endpoint.
 */
Parse.Cloud.define('isStaff', async (request) => ({
  isStaff: await services.roles.isStaff(request.user),
}));

Parse.Cloud.define('addToRole', (request) => new Promise((resolve, reject) => {
  const userQuery = new Parse.Query(Parse.User);

  userQuery.get(request.params.userID).then((user) => {
    user.set('role', String(request.params.roleName));
    user.set('adminVerified', true);
    return user;
  }).then((user) => user.save(null, { useMasterKey: true })).then((result) => {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', String(request.params.roleName));
    roleQuery.first({ useMasterKey: true }).then((role) => {
      role.getUsers().add(result);
      role.save(null, { useMasterKey: true });
      resolve(result);
    }, (error) => {
      reject(error);
    });
  }, (error) => {
    reject(error);
  });
}));
