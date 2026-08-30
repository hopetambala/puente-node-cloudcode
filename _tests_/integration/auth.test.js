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
