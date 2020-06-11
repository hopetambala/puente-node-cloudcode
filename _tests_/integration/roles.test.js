const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');

test('Hello World exists', async () => {
  expect(cloudFunctions.hello()).toBeDefined();
});

describe('role testing', () => {
  let connection;
  let db;
  let adminRoleID;
  let contribRoleID;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();
  });

  afterAll(async () => {
    await connection.close();
    await db.close();
  });

  beforeEach(async () => {
    jest.setTimeout(10000);
  });

  it('should create the admin role', async () => cloudFunctions.createAdminRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);
    console.log(jsonValues);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('admin');
    expect(result).toBeDefined();
  }));

  it('should create the manager role', async () => cloudFunctions.createManagerRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);
    console.log(jsonValues);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('manager');
    expect(result).toBeDefined();
  }));

  it('should create the contributor role', async () => cloudFunctions.createContributorRole().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);
    console.log(jsonValues);

    const roleName = jsonValues.name;
    expect(roleName).toEqual('contributor');
    expect(result).toBeDefined();
  }));

  it('should return the 3 created roles', async () => cloudFunctions.queryRoles().then((result) => {
    const jsonString = JSON.stringify(result);
    const jsonValues = JSON.parse(jsonString);
    console.log(jsonValues);

    let count = 0;
    for (const i in jsonValues) {
      count += 1;
      expect(jsonValues[i]).toBeDefined();
    }
    expect(count).toEqual(3);
  }));
  it('should add a user with admin role', async () => {
    const credentials = {
      firstname: 'Luke',
      lastname: 'Skywalker',
      username: 'blueSaber',
      password: 'leia',
      email: 'lskywalker@gmail.com',
      organization: 'star-wars',
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues.firstname).toEqual('Luke');
      expect(jsonValues.lastname).toEqual('Skywalker');
      expect(jsonValues.username).toEqual('blueSaber');
      expect(jsonValues.email).toEqual('lskywalker@gmail.com');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('administrator');
      expect(jsonValues.adminVerified).toEqual(true);
      adminRoleID = jsonValues.objectId;
    });
  });

  it('should add a user with contributor role', async () => {
    const credentials = {
      firstname: 'Han',
      lastname: 'Solo',
      username: 'falcon',
      password: 'leia',
      email: 'soloman@gmail.com',
      organization: 'star-wars',
    };
    return cloudFunctions.signup(credentials).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues.firstname).toEqual('Han');
      expect(jsonValues.lastname).toEqual('Solo');
      expect(jsonValues.username).toEqual('falcon');
      expect(jsonValues.email).toEqual('soloman@gmail.com');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('contributor');
      expect(jsonValues.adminVerified).toEqual(false);
      contribRoleID = jsonValues.objectId;
    });
  });

  it('should return the admin user who is automatically verified', async () => {
    const query_params = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationVerified(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues[0].firstname).toEqual('Luke');
      expect(jsonValues[0].lastname).toEqual('Skywalker');
      expect(jsonValues[0].username).toEqual('blueSaber');
      expect(jsonValues[0].organization).toEqual('star-wars');
      expect(jsonValues[0].role).toEqual('administrator');
      expect(jsonValues[0].adminVerified).toEqual(true);
      expect(jsonValues[0].objectId).toEqual(adminRoleID);
    });
  });

  it('should return the contrib user who is not verified', async () => {
    const query_params = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationUnverified(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues[0].firstname).toEqual('Han');
      expect(jsonValues[0].lastname).toEqual('Solo');
      expect(jsonValues[0].username).toEqual('falcon');
      expect(jsonValues[0].organization).toEqual('star-wars');
      expect(jsonValues[0].role).toEqual('contributor');
      expect(jsonValues[0].adminVerified).toEqual(false);
      expect(jsonValues[0].objectId).toEqual(contribRoleID);
    });
  });

  it('should add the contrib user to a manager role', async () => {
    const add_params = {
      userID: contribRoleID,
      roleName: 'manager',
    };

    return cloudFunctions.addToRole(add_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues.firstname).toEqual('Han');
      expect(jsonValues.lastname).toEqual('Solo');
      expect(jsonValues.username).toEqual('falcon');
      expect(jsonValues.organization).toEqual('star-wars');
      expect(jsonValues.role).toEqual('manager');
      expect(jsonValues.adminVerified).toEqual(true);
      expect(jsonValues.objectId).toEqual(contribRoleID);
    });
  });

  it('should return both users now (both verified)', async () => {
    const query_params = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationVerified(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      for (const i in jsonValues) {
        if (jsonValues[i].firstname == 'Luke') {
          expect(jsonValues[i].firstname).toEqual('Luke');
          expect(jsonValues[i].lastname).toEqual('Skywalker');
          expect(jsonValues[i].username).toEqual('blueSaber');
          expect(jsonValues[i].organization).toEqual('star-wars');
          expect(jsonValues[i].role).toEqual('administrator');
          expect(jsonValues[i].adminVerified).toEqual(true);
          expect(jsonValues[i].objectId).toEqual(adminRoleID);
        } else if (jsonValues[i].firstname == 'Han') {
          expect(jsonValues[i].firstname).toEqual('Han');
          expect(jsonValues[i].lastname).toEqual('Solo');
          expect(jsonValues[i].username).toEqual('falcon');
          expect(jsonValues[i].organization).toEqual('star-wars');
          expect(jsonValues[i].role).toEqual('manager');
          expect(jsonValues[i].adminVerified).toEqual(true);
          expect(jsonValues[i].objectId).toEqual(contribRoleID);
        }
      }
    });
  });

  it('should return no users - both verified', async () => {
    const query_params = {
      organization: 'star-wars',
    };

    return cloudFunctions.organizationUnverified(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      expect(jsonValues[0]).not.toBeDefined();
    });
  });
});
