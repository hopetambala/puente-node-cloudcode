const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');

test('Hello World exists', async () => {
  // expect.assertions(1);
  // const data = await cloudFunctions.hello()
  expect(cloudFunctions.hello()).toBeDefined();
});
