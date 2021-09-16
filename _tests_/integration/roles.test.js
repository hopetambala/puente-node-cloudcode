const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');

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

    return cloudFunctions.addToRole(addParams).then((result) => {
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
