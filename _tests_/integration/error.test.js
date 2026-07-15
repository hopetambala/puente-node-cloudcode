const { cloudFunctions } = require('../run-cloud');

describe('crud testing', () => {
  it('Test error response in SurveyData post when empy params', async () => {
    const postParams = {
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      const err = 'Error: no request params';
      expect(result).toEqual(err);
    });
  });
});
