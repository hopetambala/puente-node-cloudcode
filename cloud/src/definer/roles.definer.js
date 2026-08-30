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
  // Master-key only. This function performs every write under the master key,
  // so an unauthenticated caller could otherwise name any role and join it.
  //
  // It was previously open, with `puente_staff` blocked by name. A blocklist is
  // the wrong shape once org-admin is itself a Parse role: `org_<shortCode>`
  // admin membership decides who can administer a partner organization, and a
  // name-by-name deny list has to be extended every time a role is added — the
  // one that gets forgotten is the hole.
  //
  // Closing it entirely is safe: there are zero callers in Manage and Collect
  // (verified across both repos), so the only consumers are the integration
  // suite and any master-key script.
  //
  // Role membership is granted deliberately, by something holding the master
  // key. There is no self-service promotion anywhere in this system.
  if (!request.master) {
    reject(new Error(
      'addToRole requires the master key. Role membership decides who can '
      + 'administer an organization, so it is never grantable by an '
      + 'unauthenticated caller.',
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

/**
 * Removes public WRITE from every existing role.
 *
 * createAdminRole is idempotent, so fixing its code does not repair a role that
 * already exists — and the production `admin` role, created 2020-11-05, carries
 * ACL {"*":{"read":true,"write":true}}. This is the remediation that repairs it.
 *
 * Public READ is left alone. The three legacy roles are read-publicly by design
 * and nothing depends on hiding them; write is the escalation.
 *
 * Master-key only, obviously: an endpoint that rewrites role ACLs is exactly
 * the thing an attacker would reach for.
 */
Parse.Cloud.define('lockLegacyRoleAcls', async (request) => {
  if (!request.master) {
    throw new Error('lockLegacyRoleAcls requires the master key');
  }

  const roles = await new Parse.Query(Parse.Role).find({ useMasterKey: true });
  const repaired = [];

  await Promise.all(roles.map(async (role) => {
    const acl = role.getACL();
    if (!acl || !acl.getPublicWriteAccess()) return;
    acl.setPublicWriteAccess(false);
    role.setACL(acl);
    await role.save(null, { useMasterKey: true });
    repaired.push(role.get('name'));
  }));

  return { repaired, checked: roles.length };
});
