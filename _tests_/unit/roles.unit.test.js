const Roles = require('../../cloud/src/services/roles/roles');

/**
 * Minimal Parse stand-in that records how the query was built.
 *
 * `isStaff` MUST run under the master key: the `puente_staff` role is
 * deliberately created with no public read (unlike the legacy `admin` role,
 * which `createAdminRole` makes publicly WRITABLE). A session-scoped query
 * would find nothing and every staff member would silently read as non-staff —
 * a permission failure that looks exactly like a correct denial.
 */
const makeParse = (firstResult) => {
  const calls = { equalTo: [], first: [], queriedClass: null };

  function Query(cls) {
    calls.queriedClass = cls;
  }
  Query.prototype.equalTo = function equalTo(key, value) {
    calls.equalTo.push([key, value]);
    return this;
  };
  Query.prototype.first = function first(options) {
    calls.first.push(options);
    return Promise.resolve(firstResult);
  };

  return { Parse: { Query, Role: 'RoleClass' }, calls };
};

/**
 * Stand-in with the pieces role CREATION touches: an ACL that records what was
 * granted, and a Role constructor that records what it was saved with.
 */
const makeCreateParse = (existingRole) => {
  const calls = {
    saved: [], created: [], first: [], aclSets: [],
  };

  function ACL() {
    this.publicRead = null;
    this.publicWrite = null;
  }
  ACL.prototype.setPublicReadAccess = function set(v) {
    calls.aclSets.push(['read', v]);
    this.publicRead = v;
  };
  ACL.prototype.setPublicWriteAccess = function set(v) {
    calls.aclSets.push(['write', v]);
    this.publicWrite = v;
  };
  ACL.prototype.getPublicReadAccess = function get() { return this.publicRead === true; };
  ACL.prototype.getPublicWriteAccess = function get() { return this.publicWrite === true; };

  function Role(name, acl) {
    this.name = name;
    this.acl = acl;
    calls.created.push(this);
  }
  Role.prototype.save = function save(attrs, options) {
    calls.saved.push({ role: this, options });
    return Promise.resolve(this);
  };

  function Query() {}
  Query.prototype.equalTo = function equalTo() { return this; };
  Query.prototype.first = function first(options) {
    calls.first.push(options);
    return Promise.resolve(existingRole);
  };

  return { Parse: { ACL, Role, Query }, calls };
};

describe('Roles.createStaffRole', () => {
  it('grants NO public read and NO public write on the role object', async () => {
    const { Parse, calls } = makeCreateParse(undefined);

    await Roles.createStaffRole({ Parse });

    const [role] = calls.created;
    // The legacy createAdminRole sets setPublicWriteAccess(true), which lets
    // anyone holding the shipped JavaScript key add themselves to `admin`.
    // Repeating that here would make the whole isStaff gate theatre.
    expect(role.acl.getPublicWriteAccess()).toBe(false);
    expect(role.acl.getPublicReadAccess()).toBe(false);

    // Asserted as an EXPLICIT lock, not merely an un-granted default: a
    // future edit that starts granting access should have to delete a line
    // that says so, rather than silently inherit a permissive default.
    expect(calls.aclSets).toEqual(expect.arrayContaining([['read', false], ['write', false]]));
  });

  it('names the role puente_staff and saves it with the master key', async () => {
    const { Parse, calls } = makeCreateParse(undefined);

    await Roles.createStaffRole({ Parse });

    expect(calls.created[0].name).toEqual('puente_staff');
    expect(calls.saved[0].options).toEqual({ useMasterKey: true });
  });

  it('is idempotent — an existing role is returned, never duplicated', async () => {
    const existing = { id: 'role-existing' };
    const { Parse, calls } = makeCreateParse(existing);

    // A duplicate _Role sharing a name makes membership checks
    // non-deterministic: `first()` would return whichever one it happened to
    // find, so half the staff would read as non-staff.
    await expect(Roles.createStaffRole({ Parse })).resolves.toBe(existing);
    expect(calls.created).toHaveLength(0);
    expect(calls.saved).toHaveLength(0);
  });
});

describe('Roles.mayAdministerOrganizations', () => {
  const user = { id: 'user-1' };

  it('allows a master-key request without any role lookup', async () => {
    const { Parse, calls } = makeParse(undefined);

    await expect(Roles.mayAdministerOrganizations({ master: true }, { Parse }))
      .resolves.toBe(true);

    // The backfill, the integration tests and the ops console all call with the
    // master key and no user. A role lookup there would reject them.
    expect(calls.first).toHaveLength(0);
  });

  it('allows a staff user on a non-master request', async () => {
    const { Parse } = makeParse({ id: 'role-1' });

    await expect(Roles.mayAdministerOrganizations({ master: false, user }, { Parse }))
      .resolves.toBe(true);
  });

  it('refuses a non-staff user', async () => {
    const { Parse } = makeParse(undefined);

    await expect(Roles.mayAdministerOrganizations({ master: false, user }, { Parse }))
      .resolves.toBe(false);
  });

  it('refuses an unauthenticated request', async () => {
    const { Parse } = makeParse({ id: 'role-1' });

    await expect(Roles.mayAdministerOrganizations({ master: false }, { Parse }))
      .resolves.toBe(false);
  });
});

describe('Roles.isStaff', () => {
  const user = { id: 'user-1' };

  it('returns false for a missing user, without querying at all', async () => {
    const { Parse, calls } = makeParse(undefined);

    await expect(Roles.isStaff(undefined, { Parse })).resolves.toBe(false);
    await expect(Roles.isStaff(null, { Parse })).resolves.toBe(false);

    // An unauthenticated request must be cheap to reject, and must never
    // reach a query whose empty result could be misread.
    expect(calls.first).toHaveLength(0);
  });

  it('returns true when the user belongs to puente_staff', async () => {
    const { Parse } = makeParse({ id: 'role-1' });

    await expect(Roles.isStaff(user, { Parse })).resolves.toBe(true);
  });

  it('returns false when the user does not belong to the role', async () => {
    const { Parse } = makeParse(undefined);

    await expect(Roles.isStaff(user, { Parse })).resolves.toBe(false);
  });

  it('scopes the query to the puente_staff role AND to this user', async () => {
    const { Parse, calls } = makeParse({ id: 'role-1' });

    await Roles.isStaff(user, { Parse });

    // Both clauses matter. Without the user clause this returns true for
    // anyone the moment the role exists.
    expect(calls.equalTo).toEqual(expect.arrayContaining([
      ['name', 'puente_staff'],
      ['users', user],
    ]));
  });

  it('queries with the master key, because the role is not publicly readable', async () => {
    const { Parse, calls } = makeParse({ id: 'role-1' });

    await Roles.isStaff(user, { Parse });

    expect(calls.first[0]).toEqual({ useMasterKey: true });
  });
});
