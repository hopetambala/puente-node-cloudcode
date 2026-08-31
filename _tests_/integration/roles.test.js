const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

// These tests are about ROLE assignment, so their fixture organization has to
// be one the server can identify — signup no longer grants administrator for a
// string nobody recognises. Registering it keeps the assertions below testing
// what they were written to test.
beforeAll(async () => {
  await cloudFunctions.createOrganization({
    name: 'star-wars', shortCode: 'star-wars', aliases: ['star-wars'], active: true,
  });
});

describe('role testing', () => {
  let adminRoleID;
  let contribRoleID;

  beforeEach(async () => {
    jest.setTimeout(10000);
  });

  it('should create the admin role', async () => cloudFunctions.createAdminRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('admin');
    expect(result).toBeDefined();
  }));

  it('should create the manager role', async () => cloudFunctions.createManagerRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('manager');
    expect(result).toBeDefined();
  }));

  it('should create the contributor role', async () => cloudFunctions.createContributorRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('contributor');
    expect(result).toBeDefined();
  }));

  it('should return the 3 created roles', async () => cloudFunctions.queryRoles().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);

    let count = 0;
    Object.keys(jsonValues).forEach((key) => {
      count += 1;
      expect(jsonValues[key]).toBeDefined();
    });
    expect(count).toEqual(3);
  }));

  it('should add a user with admin role', async () => {
    const credentials = {
      firstname: 'Luke__',
      lastname: 'Skywalker',
      password: 'leia',
      email: 'lskywalker@gmail.com',
      organization: 'star-wars',
      restParams: {
        runMessaging: false,
        path: 'email',
      },
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Luke__');
      expect(jsonValues.lastname).toEqual('Skywalker');
      expect(jsonValues.username).toEqual('lskywalker@gmail.com');
      expect(jsonValues.email).toEqual('lskywalker@gmail.com');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('administrator');
      expect(jsonValues.adminVerified).toEqual(true);
      adminRoleID = jsonValues.objectId;
    });
  });

  it('should add a user with contributor role', async () => {
    const credentials = {
      firstname: 'Han__',
      lastname: 'Solo',
      password: 'leia',
      email: 'soloman@gmail.com',
      organization: 'star-wars',
      phonenumber: '1234567373',
      restParams: {
        runMessaging: false,
        path: 'email',
      },
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Han__');
      expect(jsonValues.lastname).toEqual('Solo');
      expect(jsonValues.username).toEqual('1234567373');
      expect(jsonValues.email).toEqual('soloman@gmail.com');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('contributor');
      expect(jsonValues.adminVerified).toEqual(false);
      contribRoleID = jsonValues.objectId;
    });
  });

  it('should return the admin user who is automatically verified', async () => {
    const queryParams = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationVerified(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const adminUser = jsonValues.filter((user) => user.firstname === 'Luke__');

      expect(adminUser[0].firstname).toEqual('Luke__');
      expect(adminUser[0].lastname).toEqual('Skywalker');
      expect(adminUser[0].username).toEqual('lskywalker@gmail.com');
      expect(adminUser[0].organization).toEqual('star-wars');
      expect(adminUser[0].role).toEqual('administrator');
      expect(adminUser[0].adminVerified).toEqual(true);
      expect(adminUser[0].objectId).toEqual(adminRoleID);
    });
  });

  it('should return the contrib user who is not verified', async () => {
    const queryParams = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationUnverified(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const contribUser = jsonValues.filter((user) => user.firstname === 'Han__');

      expect(contribUser[0].firstname).toEqual('Han__');
      expect(contribUser[0].lastname).toEqual('Solo');
      expect(contribUser[0].username).toEqual('1234567373');
      expect(contribUser[0].organization).toEqual('star-wars');
      expect(contribUser[0].role).toEqual('contributor');
      expect(contribUser[0].adminVerified).toEqual(false);
      expect(contribUser[0].objectId).toEqual(contribRoleID);
    });
  });

  it('should add the contrib user to a manager role', async () => {
    const addParams = {
      userID: contribRoleID,
      roleName: 'manager',
    };

    // addToRole is master-key only since org-admin became a Parse role; the
    // assignment behaviour asserted below is unchanged.
    return cloudFunctions.addToRolePrivileged(addParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Han__');
      expect(jsonValues.lastname).toEqual('Solo');
      expect(jsonValues.username).toEqual('1234567373');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('manager');
      expect(jsonValues.adminVerified).toEqual(true);
      expect(jsonValues.objectId).toEqual(contribRoleID);
    });
  });

  it('refuses ANY unprivileged call, not just puente_staff', async () => {
    // Once org-admin is a Parse role, a name-by-name blocklist is the wrong
    // shape: org_<shortCode>_admin would be grantable by anyone holding the
    // app id. addToRole writes every change under the master key and has zero
    // callers in Manage or Collect, so it is closed to unprivileged callers
    // entirely.
    await expect(cloudFunctions.addToRole({
      userID: contribRoleID,
      roleName: 'manager',
    })).rejects.toThrow(/master key/i);
  });

  it('refuses to grant puente_staff, which would be a self-service escalation', async () => {
    // Kept as a named case even though the master-key gate above already covers
    // it. puente_staff is the privilege whose escalation was demonstrated
    // against a live Parse server before it was closed; a regression here is
    // the one that matters most, and a test naming it explicitly is what makes
    // that visible to whoever breaks it.
    await expect(cloudFunctions.addToRole({
      userID: contribRoleID,
      roleName: 'puente_staff',
    })).rejects.toThrow(/master key/i);
  });

  it('should return both users now (both verified)', async () => {
    const queryParams = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationVerified(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const contribUser = jsonValues.filter((user) => user.firstname === 'Han__');
      const adminUser = jsonValues.filter((user) => user.firstname === 'Luke__');

      expect(adminUser[0].firstname).toEqual('Luke__');
      expect(adminUser[0].lastname).toEqual('Skywalker');
      expect(adminUser[0].username).toEqual('lskywalker@gmail.com');
      expect(adminUser[0].organization).toEqual('star-wars');
      expect(adminUser[0].role).toEqual('administrator');
      expect(adminUser[0].adminVerified).toEqual(true);
      expect(adminUser[0].objectId).toEqual(adminRoleID);

      expect(contribUser[0].firstname).toEqual('Han__');
      expect(contribUser[0].lastname).toEqual('Solo');
      expect(contribUser[0].username).toEqual('1234567373');
      expect(contribUser[0].organization).toEqual('star-wars');
      expect(contribUser[0].role).toEqual('manager');
      expect(contribUser[0].adminVerified).toEqual(true);
      expect(contribUser[0].objectId).toEqual(contribRoleID);
    });
  });

  it('should return no users - both verified', async () => {
    const queryParams = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationUnverified(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues[0]).not.toBeDefined();
    });
  });

  it('should delete all users', async () => {
    const removeParams = [
      {
        userId: adminRoleID,
      },
      {
        userId: contribRoleID,
      },
    ];

    return removeParams.map((user) => cloudFunctions.deleteUser(user));
  });
});

describe('the legacy admin role must not be publicly writable', () => {
  it('createAdminRole does not grant public write', async () => {
    // VERIFIED IN PRODUCTION 2026-08-30: the live `admin` role carries
    // ACL {"*":{"read":true,"write":true}}. Anyone holding the app id and REST
    // key can add themselves to it by writing the role object directly,
    // bypassing addToRole entirely. And signup sets
    // setRoleWriteAccess('admin', true) on EVERY user record, so membership of
    // this role grants write access to every account in the system.
    const role = await cloudFunctions.createAdminRole();
    const fresh = await new Parse.Query(Parse.Role).get(role.id, { useMasterKey: true });

    expect(fresh.getACL().getPublicWriteAccess()).toBe(false);
  });

  it('lockLegacyRoleAcls removes public write from an existing role', async () => {
    // createAdminRole is idempotent, so fixing its code does not repair a role
    // that already exists. Production needs a remediation it can run.
    const role = await new Parse.Query(Parse.Role).first({ useMasterKey: true });
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    role.setACL(acl);
    await role.save(null, { useMasterKey: true });

    await cloudFunctions.lockLegacyRoleAcls({});

    const fresh = await new Parse.Query(Parse.Role).get(role.id, { useMasterKey: true });
    expect(fresh.getACL().getPublicWriteAccess()).toBe(false);
  });

  it('lockLegacyRoleAcls is master-key only', async () => {
    await expect(cloudFunctions.lockLegacyRoleAclsUnprivileged({}))
      .rejects.toThrow(/master key/i);
  });
});

describe('seedPuenteStaff makes staff exist at all', () => {
  // puente_staff gates organization administration, but nothing had ever
  // created it: createPuenteStaffRole is master-key only and had not been run,
  // so in production NOBODY was staff and the admin screen redirected everyone.
  // Doing it by hand is create-the-role then add-each-user; one call is one
  // fewer chance to do half of it.
  let staffUserId;

  beforeAll(async () => {
    await cloudFunctions.createOrganization({
      name: 'seed-staff-co', shortCode: 'seed-staff-co', aliases: [], active: true,
    });
    const user = await cloudFunctions.signup({
      firstname: 'Seed',
      lastname: 'Staff',
      password: 'pw',
      email: '',
      phonenumber: '9700000000',
      organization: 'seed-staff-co',
    });
    staffUserId = JSON.parse(JSON.stringify(user)).objectId;
  });

  it('is master-key only — it grants the highest privilege in the system', async () => {
    await expect(cloudFunctions.seedPuenteStaffUnprivileged({ userIds: [staffUserId] }))
      .rejects.toThrow(/master key/i);
  });

  it('creates the role and puts the named accounts in it', async () => {
    const result = await cloudFunctions.seedPuenteStaff({ userIds: [staffUserId] });

    expect(result.granted).toEqual([staffUserId]);

    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', 'puente_staff');
    roleQuery.equalTo('users', { __type: 'Pointer', className: '_User', objectId: staffUserId });
    expect(await roleQuery.first({ useMasterKey: true })).toBeDefined();
  });

  it('is idempotent, so re-running cannot duplicate the role or the membership', async () => {
    await expect(cloudFunctions.seedPuenteStaff({ userIds: [staffUserId] }))
      .resolves.toBeDefined();

    const roles = await new Parse.Query(Parse.Role)
      .equalTo('name', 'puente_staff').find({ useMasterKey: true });
    expect(roles).toHaveLength(1);
  });

  it('reports a userId it could not find rather than failing the whole seed', async () => {
    // A typo in one id must not silently drop the others, nor abort the batch.
    const result = await cloudFunctions.seedPuenteStaff({
      userIds: [staffUserId, 'ZZnotarealid00'],
    });

    expect(result.granted).toContain(staffUserId);
    expect(result.notFound).toContain('ZZnotarealid00');
  });

  it('refuses an empty list rather than quietly doing nothing', async () => {
    await expect(cloudFunctions.seedPuenteStaff({ userIds: [] }))
      .rejects.toThrow(/userIds/i);
  });
});
