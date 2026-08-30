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
  // This function takes NO auth and does every write under the master key, so
  // any unauthenticated caller holding the app id can name a role and join it.
  // That is survivable for the three legacy roles, which are inert and gate
  // nothing (see the billing scope §7.1). It is not survivable for
  // `puente_staff`, which gates createOrganization — granting it here would
  // hand out exactly the privilege that gate exists to withhold, and the role's
  // locked ACL cannot prevent it because this write uses the master key.
  //
  // Staff membership has one legitimate path: the master-key seed script. There
  // is deliberately no self-service promotion.
  //
  // The wider problem — that addToRole is unauthenticated at all — is
  // pre-existing and unaddressed here on purpose; it deserves its own change
  // rather than being folded into this one.
  if (String(request.params.roleName) === services.roles.STAFF_ROLE_NAME) {
    reject(new Error(
      'addToRole cannot grant puente_staff. Staff membership is seeded with the '
      + 'master key, never through an unauthenticated endpoint.',
    ));
    return;
  }

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
