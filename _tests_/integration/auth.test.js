const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');

describe('role testing', () => {
  let connection;
  let db;
  let adminRoleID;
  let contribRoleID;
  let rollingUserObject;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = connection.db();
  });

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

  afterAll(async () => {
    await connection.close();
    await db.close();
  });
});
