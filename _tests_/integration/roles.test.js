const { cloudFunctions } = require('../run-cloud');
const { MongoClient } = require('mongodb');

test('Hello World exists', async () => {
  // expect.assertions(1);
  // const data = await cloudFunctions.hello()
  expect(cloudFunctions.hello()).toBeDefined();
});

describe('role testing', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    db = await connection.db();
  });

  afterAll(async () => {
    await connection.close();
    await db.close();
  });

  beforeEach(async () => {
    jest.setTimeout(10000)
  })

  it('should create the admin role', async () => {
    return cloudFunctions.createAdminRole().then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      let roleName = jsonValues['name'];
      expect(roleName).toEqual('admin');
      expect(result).toBeDefined();
    });
  });

  it('should create the manager role', async () => {
    return cloudFunctions.createManagerRole().then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      let roleName = jsonValues['name'];
      expect(roleName).toEqual('manager');
      expect(result).toBeDefined();
    });
  });

  it('should create the contributor role', async () => {
    return cloudFunctions.createContributorRole().then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      let roleName = jsonValues['name'];
      expect(roleName).toEqual('contributor');
      expect(result).toBeDefined();
    });
  });

  it('should create the manager role - test', async () => {
    return cloudFunctions.signin().then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      // let roleName = jsonValues['name'];
      // expect(roleName).toEqual('manager');
      expect(result).toBeDefined();
    });
  });


  // it('should return the 3 created roles', async () => {
  //   return cloudFunctions.queryRoles().then(function (result) {
  //     let jsonString = JSON.stringify(result)
  //     let jsonValues = JSON.parse(jsonString);
  //     console.log(jsonValues);

  //     // console.log(result);
  //     // expect(result[0]).toBeDefined();
  //     // expect(result[1]).toBeDefined();
  //     // expect(result[2]).toBeDefined();
  //     // expect(result[3]).not.toBeDefined();
  //   });
  // });
  it('should add a user with admin role', async () => {
    const credentials = {
      firstname: 'Luke',
      lastname: 'Skywalker',
      username: 'blueSaber',
      password: 'leia',
      email: 'lskywalker@gmail.com',
      organization: 'star-wars'
    }
    return cloudFunctions.signin(credentials).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);
    })
  })


});