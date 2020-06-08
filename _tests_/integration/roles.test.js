const { cloudFunctions } = require('../run-cloud');
const { MongoClient } = require('mongodb');

test('Hello World exists', async () => {
  // expect.assertions(1);
  // const data = await cloudFunctions.hello()
  expect(cloudFunctions.hello()).toBeDefined();
});