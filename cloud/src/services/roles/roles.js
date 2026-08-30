/**
 * The cross-organization Puente-internal role. Tenancy only — it spans every
 * organization and carries no permission tier within one. See the billing
 * scope §7.1 for why a hierarchy is deliberately NOT being built here.
 */
const STAFF_ROLE_NAME = 'puente_staff';

const Roles = {
  STAFF_ROLE_NAME,

  /**
   * Is this user Puente-internal staff?
   *
   * Runs under the master key on purpose. `puente_staff` is created with no
   * public read (unlike the legacy `admin` role, which `createAdminRole` below
   * makes publicly WRITABLE — see the note there). A session-scoped query would
   * therefore find nothing and every staff member would read as non-staff: a
   * permission failure indistinguishable from a correct denial.
   *
   * `Parse` is injected so the query CONTRACT is testable — that both clauses
   * are applied and that the master key is used.
   */
  isStaff: async function isStaff(user, { Parse: injectedParse } = {}) {
    // An unauthenticated request is rejected without a round-trip. It also
    // keeps an absent user from becoming a query whose empty result is
    // ambiguous.
    if (!user) return false;

    const ParseSdk = injectedParse || Parse;
    const query = new ParseSdk.Query(ParseSdk.Role);
    query.equalTo('name', STAFF_ROLE_NAME);
    // Both clauses are load-bearing. Without the user clause this returns true
    // for everyone the moment the role exists.
    query.equalTo('users', user);

    return Boolean(await query.first({ useMasterKey: true }));
  },

  /**
   * Creates the `puente_staff` role, once.
   *
   * Deliberately does NOT follow the pattern of the three legacy roles below.
   * `createAdminRole` sets `setPublicWriteAccess(true)` on the role object,
   * which means anyone holding the JavaScript key that ships in every client
   * bundle can add themselves to `admin`. This role gates organization
   * creation, so the same mistake here would make the gate theatre.
   *
   * The lock is written explicitly rather than left to Parse's defaults, so a
   * future edit that opens it up has to delete a line that says otherwise.
   * Membership is granted by master key only — there is deliberately no
   * self-promotion endpoint.
   */
  createStaffRole: async function createStaffRole({ Parse: injectedParse } = {}) {
    const ParseSdk = injectedParse || Parse;

    const query = new ParseSdk.Query(ParseSdk.Role);
    query.equalTo('name', STAFF_ROLE_NAME);
    const existing = await query.first({ useMasterKey: true });
    // Two roles sharing a name make membership non-deterministic: the lookup
    // in isStaff would return whichever it found first, so some staff would
    // silently read as non-staff.
    if (existing) return existing;

    const acl = new ParseSdk.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);

    const role = new ParseSdk.Role(STAFF_ROLE_NAME, acl);
    return role.save(null, { useMasterKey: true });
  },

  /**
   * May this request create or edit organizations?
   *
   * Master key OR `puente_staff`. The master-key arm is not a convenience: the
   * ops console, the seed script and the integration tests all call with the
   * master key and no user, and a role lookup would reject every one of them.
   *
   * This is the whole authorization decision for the organization admin
   * endpoints, kept in one place so it cannot drift between them.
   */
  mayAdministerOrganizations: async function mayAdministerOrganizations(request, dependencies) {
    if (request && request.master) return true;
    return Roles.isStaff(request && request.user, dependencies);
  },

  createAdminRole: function createAdminRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingAdminRole = new Parse.Query(Role);

      existingAdminRole
        .equalTo('name', 'admin')
        .first();

      existingAdminRole.first()
        .then((results) => {
          // If the admin role already exists we have nothing to do here
          if (results) {
            console.log('Admin Exists'); // eslint-disable-line
            resolve(results);
          } else {
            console.log('Admin Does Not Exist'); // eslint-disable-line
            const acl = new Parse.ACL();
            acl.setPublicReadAccess(true);
            acl.setPublicWriteAccess(true);
            acl.setRoleWriteAccess('manager', true);
            acl.setRoleWriteAccess('contributor', true);
            acl.setRoleReadAccess('manager', true);
            acl.setRoleReadAccess('contributor', true);
            const adminRole = new Role();
            adminRole.set('name', 'admin');
            adminRole.setACL(acl);
            adminRole.save({}, { useMasterKey: true })
              .then((admin) => {
                resolve(admin);
              }, (error) => {
                reject(error);
              });
          }
        },
        (error) => {
          reject(error);
        });
    });
  },
  createManagerRole: function createManagerRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingManagerRole = new Parse.Query(Role)
        .equalTo('name', 'manager');
      existingManagerRole.first().then((results) => {
        // If the admin role already exists we have nothing to do here
        if (results) {
          console.log('Manager Role Exists'); // eslint-disable-line
          resolve(results);
          // If the admin role does not exist create it and set the ACLs
        } else {
          console.log('Moderator Role Does Not Exist.'); // eslint-disable-line
          const acl = new Parse.ACL();
          acl.setPublicReadAccess(true);
          acl.setPublicWriteAccess(false);
          acl.setRoleWriteAccess('admin', false);
          acl.setRoleWriteAccess('contributor', true);
          acl.setRoleReadAccess('admin', false);
          acl.setRoleReadAccess('contributor', true);
          const managerRole = new Role();
          managerRole.set('name', 'manager');
          managerRole.setACL(acl);
          managerRole.save({}, { useMasterKey: true })
            .then((manager) => {
              resolve(manager);
            }, (error) => {
              reject(error);
            });
        }
      }, (error) => {
        reject(error);
      });
    });
  },
  createContributorRole: function createContributorRole() {
    return new Promise((resolve, reject) => {
      const Role = Parse.Object.extend('_Role');
      const existingContributorRole = new Parse.Query(Role)
        .equalTo('name', 'contributor');
      existingContributorRole.first().then((results) => {
        if (results) {
          console.log('Contributor Role Exists'); // eslint-disable-line
          resolve(results);
        } else {
          console.log('Contributor Role Does Not Exist.'); // eslint-disable-line
          const acl = new Parse.ACL();
          acl.setPublicReadAccess(true);
          acl.setPublicWriteAccess(false);
          acl.setRoleWriteAccess('admin', false);
          acl.setRoleWriteAccess('manager', false);
          acl.setRoleReadAccess('admin', false);
          acl.setRoleReadAccess('manager', false);
          const contributorRole = new Role();
          contributorRole.set('name', 'contributor');
          contributorRole.setACL(acl);
          contributorRole.save({}, { useMasterKey: true })
            .then((contrib) => {
              resolve(contrib);
            }, (error) => {
              reject(error);
            });
        }
      }, (error) => {
        reject(error);
      });
    });
  },
};

module.exports = Roles;
