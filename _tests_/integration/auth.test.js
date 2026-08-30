const { Parse } = require('parse/node');
const { cloudFunctions } = require('../run-cloud');

// `got` is a real Organization here so that "first user of an organization
// becomes its administrator" is exercised for an organization the server can
// actually identify. That grant is legitimate; granting it for a string nobody
// recognises is the bug — see the guard tests at the bottom of this file.
beforeAll(async () => {
  await cloudFunctions.createOrganization({
    name: 'got', shortCode: 'got', aliases: ['got', 'Game of Thrones'], active: true,
  });
});

describe('role testing', () => {
  let adminRoleID;
  let contribRoleID;
  let rollingUserObject;

  it('should add a user with admin role', async () => {
    const credentials = {
      firstname: 'Dany',
      lastname: 'Targaryen',
      password: 'dracarys',
      email: 'bendtheknee@gmail.com',
      organization: 'got',
      restParams: {
        runMessaging: false,
      },
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Dany');
      expect(jsonValues.lastname).toEqual('Targaryen');
      expect(jsonValues.username).toEqual('bendtheknee@gmail.com');
      expect(jsonValues.email).toEqual('bendtheknee@gmail.com');
      expect(jsonValues.organization).toEqual('got');
      expect(jsonValues.role).toEqual('administrator');
      expect(jsonValues.adminVerified).toEqual(true);
      adminRoleID = jsonValues.objectId;
    });
  });

  it('should add a push token to the existing user', async () => {
    const credentials = {
      userId: adminRoleID,
      expoPushToken: 'TestExpoPushToken',
    };
    return cloudFunctions.addUserPushToken(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.expoPushToken).toEqual('TestExpoPushToken');
    });
  });

  it('should add a user to same orginzation with contributor role', async () => {
    const credentials = {
      firstname: 'Jon',
      lastname: 'Snow',
      password: 'ghost',
      email: 'iknownothing@gmail.com',
      organization: 'got',
      phonenumber: 1234567890,
      restParams: {
        runMessaging: false,
        path: 'email',
      },
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Jon');
      expect(jsonValues.lastname).toEqual('Snow');
      expect(jsonValues.username).toEqual('1234567890');
      expect(jsonValues.email).toEqual('iknownothing@gmail.com');
      expect(jsonValues.organization).toEqual('got');
      expect(jsonValues.role).toEqual('contributor');
      expect(jsonValues.phonenumber).toEqual('1234567890');
      expect(jsonValues.adminVerified).toEqual(false);
      contribRoleID = jsonValues.objectId;
    });
  });

  it('should sign the first user in -- with username', async () => {
    const credentials = {
      username: 'bendtheknee@gmail.com',
      password: 'dracarys',
    };

    return cloudFunctions.signin(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Dany');
      expect(jsonValues.lastname).toEqual('Targaryen');
      expect(jsonValues.username).toEqual('bendtheknee@gmail.com');
      expect(jsonValues.email).toEqual('bendtheknee@gmail.com');
      expect(jsonValues.organization).toEqual('got');
      expect(jsonValues.role).toEqual('administrator');
      expect(jsonValues.adminVerified).toEqual(true);
      expect(jsonValues.objectId).toEqual(adminRoleID);
    });
  });

  it('should sign the second user in -- with email', async () => {
    const credentials = {
      username: '1234567890',
      password: 'ghost',
    };

    return cloudFunctions.signin(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      rollingUserObject = jsonValues;

      expect(jsonValues.firstname).toEqual('Jon');
      expect(jsonValues.lastname).toEqual('Snow');
      expect(jsonValues.username).toEqual('1234567890');
      expect(jsonValues.email).toEqual('iknownothing@gmail.com');
      expect(jsonValues.organization).toEqual('got');
      expect(jsonValues.role).toEqual('contributor');
      expect(jsonValues.adminVerified).toEqual(false);
      expect(jsonValues.objectId).toEqual(contribRoleID);
    });
  });

  it('should update the user', async () => {
    const originalUserObject = rollingUserObject;

    const params = {
      objectId: originalUserObject.objectId,
      userObject: {
        firstname: 'Ron',
        lastname: 'Flow',
      },
    };

    return cloudFunctions.updateUser(params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.firstname).toEqual('Ron');
      expect(jsonValues.lastname).toEqual('Flow');
      expect(jsonValues.username).toEqual('1234567890');
      expect(jsonValues.email).toEqual('iknownothing@gmail.com');
      expect(jsonValues.organization).toEqual('got');
      expect(jsonValues.role).toEqual('contributor');
      expect(jsonValues.adminVerified).toEqual(false);
      expect(jsonValues.objectId).toEqual(contribRoleID);
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

describe('signup must not mint administrators from unrecognised organizations', () => {
  it('does not grant administrator over an organization by typing a variant of its name', async () => {
    // POLICY CHANGE 2026-08-30. This test used to assert that ANY unresolvable
    // organization was refused administrator. Self-service creation
    // deliberately reverses that for CLEARLY DISTINCT names - see
    // puente-react-nextjs-platform/docs/self-service-organizations.md.
    //
    // The security property that must survive, and is asserted here, is the
    // narrower and more important one: a string CLOSE to an existing
    // organization must never mint a second tenant or hand anyone admin near
    // it. That is what protects existing partners' data, and it is now
    // enforced by the fuzzy match rather than by refusing everything.
    //
    // 'Game of Thronesss' is one edit from the fixture organization's alias.
    const result = await cloudFunctions.signup({
      firstname: 'Arya',
      lastname: 'Stark',
      password: 'valarmorghulis',
      email: 'nobody@example.org',
      organization: 'Game of Thronesss',
      restParams: { runMessaging: false },
    });
    const v = JSON.parse(JSON.stringify(result));

    expect(v.role).toEqual('contributor');
    expect(v.adminVerified).toEqual(false);

    // And no second tenant was created for the typo.
    const q = new Parse.Query('Organization');
    q.equalTo('name', 'Game of Thronesss');
    expect(await q.first({ useMasterKey: true })).toBeUndefined();
  });

  it('stores the canonical name when the user typed a known alias', async () => {
    // The whole point of the alias table. Storing what was typed is what split
    // "Puente" from "Puento" across 2,800 rows in production.
    const result = await cloudFunctions.signup({
      firstname: 'Sansa',
      lastname: 'Stark',
      password: 'ladyofwinterfell',
      email: 'sansa@example.org',
      organization: 'Game of Thrones',
      restParams: { runMessaging: false },
    });
    const v = JSON.parse(JSON.stringify(result));

    expect(v.organization).toEqual('got');
  });

  it('still creates the account when the organization is unrecognised', async () => {
    // Never block a signup on a billing-adjacent lookup. An unresolved
    // organization is an ops problem; a person who cannot make an account is a
    // field problem.
    const result = await cloudFunctions.signup({
      firstname: 'Gendry',
      lastname: 'Baratheon',
      password: 'rowrowrow',
      email: 'gendry@example.org',
      organization: 'Flea Bottom Forge',
      restParams: { runMessaging: false },
    });
    const v = JSON.parse(JSON.stringify(result));

    expect(v.objectId).toBeTruthy();
    expect(v.organization).toEqual('Flea Bottom Forge');
  });
});

describe('deactivating a user actually removes access', () => {
  const PHONE = '9100000001';

  beforeAll(async () => {
    await cloudFunctions.createOrganization({
      name: 'deactivation-co', shortCode: 'deactivation-co', aliases: [], active: true,
    });
    // Two members: the first is the org's admin, the second is deactivatable
    // without tripping the last-admin protection.
    await cloudFunctions.signup({
      firstname: 'Org',
      lastname: 'Admin',
      password: 'pw',
      email: '',
      phonenumber: '9100000000',
      organization: 'deactivation-co',
    });
    await cloudFunctions.signup({
      firstname: 'Ordinary',
      lastname: 'Member',
      password: 'pw',
      email: '',
      phonenumber: PHONE,
      organization: 'deactivation-co',
    });
  });

  const userFor = async (username) => {
    const q = new Parse.Query(Parse.User);
    q.equalTo('username', username);
    return q.first({ useMasterKey: true });
  };

  it('lets an active user sign in — the control', async () => {
    await expect(cloudFunctions.signin({ username: PHONE, password: 'pw' }))
      .resolves.toBeDefined();
  });

  it('refuses an unprivileged caller, so nobody can deactivate anyone', async () => {
    const user = await userFor(PHONE);

    await expect(cloudFunctions.setUserActiveUnprivileged({ userId: user.id, active: false }))
      .rejects.toThrow(/master key|staff|admin/i);
  });

  it('refuses sign-in once deactivated', async () => {
    const user = await userFor(PHONE);
    await cloudFunctions.setUserActive({ userId: user.id, active: false });

    await expect(cloudFunctions.signin({ username: PHONE, password: 'pw' }))
      .rejects.toThrow(/deactivated/i);
  });

  it('destroys existing sessions, so an offline-first device stops syncing', async () => {
    // A flag alone would be a control that lies: Collect holds a session token
    // and would keep working until it expired, which offline-first means could
    // be a very long time.
    const user = await userFor(PHONE);
    const sessions = new Parse.Query('_Session');
    sessions.equalTo('user', user);

    expect(await sessions.count({ useMasterKey: true })).toEqual(0);
  });

  it('restores access when reactivated', async () => {
    const user = await userFor(PHONE);
    await cloudFunctions.setUserActive({ userId: user.id, active: true });

    await expect(cloudFunctions.signin({ username: PHONE, password: 'pw' }))
      .resolves.toBeDefined();
  });

  it('refuses an ORG ADMIN deactivating the last admin of their organization', async () => {
    // Otherwise a partner locks itself out and only a master key recovers it.
    // Exercised as the org admin, with a real session - the master key is an
    // override by design (D13), so asserting this against the master key would
    // test the wrong path.
    const admin = await userFor('9100000000');
    // The session token is passed explicitly. cloudFunctions.signin runs
    // Parse.User.logIn SERVER-side, so it leaves the test client with no
    // session, and the call would otherwise arrive unauthenticated.
    const session = await Parse.User.logIn('9100000000', 'pw');

    await expect(cloudFunctions.setUserActiveAsSession(
      { userId: admin.id, active: false }, session.getSessionToken(),
    )).rejects.toThrow(/last admin/i);

    await Parse.User.logOut();
  });

  it('lets the master key override the last-admin protection, per D13', async () => {
    const admin = await userFor('9100000000');

    await expect(cloudFunctions.setUserActive({ userId: admin.id, active: false }))
      .resolves.toBeDefined();

    // Restore, so this fixture does not leak a locked-out organization.
    await cloudFunctions.setUserActive({ userId: admin.id, active: true });
  });
});

describe('a failed sign-in rejects cleanly', () => {
  it('rejects a wrong password instead of crashing the server', async () => {
    // signin was written for the ancient (request, response) Cloud Code
    // signature and called response.error(...) on every failure path. In modern
    // Parse Server `response` is undefined, so ANY failed login threw a
    // TypeError that took the whole process down — it simply had no test that
    // ever made a sign-in fail.
    await expect(cloudFunctions.signin({
      username: 'nobody-at-all-9999',
      password: 'definitely-wrong',
    })).rejects.toBeDefined();
  });
});
