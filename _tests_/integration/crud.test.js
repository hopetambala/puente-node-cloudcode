const { cloudFunctions } = require('../run-cloud');
const { MongoClient } = require('mongodb');
// hello world

test('Hello World exists', async () => {
  // expect.assertions(1);
  // const data = await cloudFunctions.hello()
  expect(cloudFunctions.hello()).toBeDefined();
});

// test to ensure it is defined
test('Post Exists', async () => {
  expect(cloudFunctions.postObjectsToClass()).toBeDefined();
});

// test to ensure it is defined
test('generic Query Exists', async () => {
  expect(cloudFunctions.genericQuery()).toBeDefined();
});

test('Post object - async', async () => {
  // expect.assertions(1);
  const postParams = {
    parseClass: 'SurveyData',
    signature: 'Joe',
    photoFile: 'pictureofJoe',
    localObject: {
      fname: 'Greetings',
      lname: 'Bouble',
    },
  };
  return cloudFunctions.postObjectsToClass(postParams).then((result) => {
    console.log(result);
    // const queryParams = {
    //   parseObject: 'SurveyData'
    // };
    // expect(cloudFunctions.genericQuery(queryParams)).toHaveProperty('signature', 'ehh')
  });
}, 30000);

describe('insert', () => {
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
  });

  it('should post object object to SurveyData', async () => {
    const postParams = {
      parseClass: 'SurveyData',
      signature: 'Joe',
      photoFile: 'pictureofJoe',
      localObject: {
        fname: 'Greetings',
        lname: 'Bouble',
      },
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      console.log(result);
    });
  });

  it('should return the posted results back', async () => {
    const queryParams = {
      parseObject: 'SurveyData'
    };

    return cloudFunctions.genericQuery(queryParams).then((result) => {
      console.log(result);
      expect(result).toBeDefined();
    });
    
  });
});
