const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');

describe('crud testing', () => {
  let connection;
  let db;

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

  it('Test error response in SurveyData post when empy params', async () => {
    const postParams = {
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      const err = 'Error: no request params';
      expect(result).toEqual(err);
    });
  });
});
