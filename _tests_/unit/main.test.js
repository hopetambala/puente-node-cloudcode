
const { cloudFunctions } = require('../run-cloud');

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

test('Post object - async', async () => {
  // expect.assertions(1);
  const post_params = {
    parseClass: 'SurveyData',
    signature: 'Joe',
    photoFile: 'pictureofJoe',
    localObject: {
      fname: 'Greetings',
      lname: 'Bouble',
    },
  };
  return cloudFunctions.postObjectsToClass(post_params).then((result) => {
    console.log(result);
  });
});
