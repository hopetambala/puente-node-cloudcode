const { MongoClient } = require('mongodb');
const { cloudFunctions } = require('../run-cloud');
// hello world

test('Hello World exists', async () => {
  expect(cloudFunctions.hello()).toBeDefined();
});

test('Post Exists', async () => {
  expect(cloudFunctions.postObjectsToClass()).toBeDefined();
});

test('generic Query Exists', async () => {
  expect(cloudFunctions.genericQuery()).toBeDefined();
});

describe('crud testing', () => {
  let connection;
  let db;
  let postID1;

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

  it('should post object object to SurveyData', async () => {
    const postParams = {
      parseClass: 'SurveyData',
      signature: 'Test',
      photoFile: 'TestPicture',
      localObject: {
        fname: 'Greetings__',
        lname: 'Tester',
        latitude: 4,
        longitude: 5,
      },
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.fname).toEqual('Greetings__');
      expect(jsonValues.lname).toEqual('Tester');
      expect(jsonValues.latitude).toEqual(4);
      expect(jsonValues.longitude).toEqual(5);
      expect(jsonValues.picture).toBeDefined();
      expect(jsonValues.signature).toBeDefined();
      expect(jsonValues.location).toBeDefined();

      postID1 = result.id;
    });
  });

  it('should post an object to class with relation to original post with a variety of classes', async () => {
    const postParams = {
      parseParentClass: 'SurveyData',
      parseParentClassID: postID1,
      localObject: [
        {
          tag: 'Vitals',
          key: 'height',
          value: '4',
        },
        {
          tag: 'HistoryMedical',
          key: 'majorEvents',
          value: null,
        },
        {
          tag: 'Prescriptions',
          key: 'name',
          value: 'Greetings__',
        },
        {
          tag: 'Allergies',
          key: 'substance',
          value: 'Tester',
        },
        {
          tag: 'EvaluationSurgical',
          key: 'AssessmentandEvaluationSurgical',
          value: 'Have',
        },
        {
          tag: 'EvaluationMedical',
          key: 'chronic_condition_hypertension',
          value: 'swell',
        },
        {
          tag: 'HistoryEnvironmentalHealth',
          key: 'yearsLivedinthecommunity',
          value: 'day!',
        },
      ],
    };

    return cloudFunctions.postObjectsToAnyClassWithRelation(postParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      Object.keys(jsonValues).forEach((key) => {
      // })
        // for (i in jsonValues) {
        // ensure all are related to original surveyData form
        const { client } = jsonValues[key];
        const type = client.__type; // eslint-disable-line
        const { className } = client;
        const objectID = client.objectId;
        expect(type).toEqual('Pointer');
        expect(className).toEqual('SurveyData');
        expect(objectID).toEqual(postID1);

        // testing other attributes are correctly added
        if ('height' in jsonValues[key]) {
          const { height } = jsonValues[key];
          expect(height).toEqual('4');
        }
        if ('majorEvents' in jsonValues[key]) {
          const { majorEvents } = jsonValues[key];
          expect(majorEvents).toEqual(null);
        }
        if ('name' in jsonValues[key]) {
          const { name } = jsonValues[key];
          expect(name).toEqual('Greetings__');
        }
        if ('substance' in jsonValues[key]) {
          const { substance } = jsonValues[key];
          expect(substance).toEqual('Tester');
        }
        if ('AssessmentandEvaluationSurgical' in jsonValues[key]) {
          const { AssessmentandEvaluationSurgical } = jsonValues[key];
          expect(AssessmentandEvaluationSurgical).toEqual('Have');
        }
        if ('chronic_condition_hypertension' in jsonValues[key]) {
          const chronicConditionHypertension = jsonValues[key].chronic_condition_hypertension;
          expect(chronicConditionHypertension).toEqual('swell');
        }
        if ('yearsLivedinthecommunity' in jsonValues[key]) {
          const { yearsLivedinthecommunity } = jsonValues[key];
          expect(yearsLivedinthecommunity).toEqual('day!');
        }
      });
      expect(result).toBeDefined();
    });
  });

  it('should update the originally posted item', async () => {
    const updateParams = {
      parseClass: 'SurveyData',
      parseClassID: postID1,
      localObject: {
        height: 'Test',
        majorEvents: 'this',
        name: 'is.',
        substance: 'Succeed',
        AssessmentandEvaluationSurgical: 'it',
        chronic_condition_hypertension: 'must',
        yearsLivedinthecommunity: null,
        latitude: 3,
        longitude: 4,
      },
    };
    return cloudFunctions.updateObject(updateParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      // updated properties
      const { height } = jsonValues;
      const { majorEvents } = jsonValues;
      const { name } = jsonValues;
      const { substance } = jsonValues;
      const { AssessmentandEvaluationSurgical } = jsonValues;
      const chronicConditionHypertension = jsonValues.chronic_condition_hypertension;
      const { yearsLivedinthecommunity } = jsonValues;
      const { latitude } = jsonValues;
      const { longitude } = jsonValues;

      // properties that were not updated
      const { fname } = jsonValues;
      const { lname } = jsonValues;

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronicConditionHypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);

      expect(fname).toEqual('Greetings__');
      expect(lname).toEqual('Tester');

      expect(result).toBeDefined();
    });
  });

  it('should return the the updated object - geo query', async () => {
    const queryParams = {
      lat: 3,
      long: 4,
      limit: 10,
      parseColumn: 'height',
      parseParam: 'Test',
    };

    return cloudFunctions.geoQuery(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const surveyData = jsonValues.filter((data) => data.fname === 'Greetings__');

      // properties from updated object with geolocation with 5 miles
      const { height } = surveyData[0];
      const { majorEvents } = surveyData[0];
      const { name } = surveyData[0];
      const { substance } = surveyData[0];
      const { AssessmentandEvaluationSurgical } = surveyData[0];
      const chronicConditionHypertension = surveyData[0].chronic_condition_hypertension;
      const { yearsLivedinthecommunity } = surveyData[0];
      const { latitude } = surveyData[0];
      const { longitude } = surveyData[0];
      const { fname } = surveyData[0];
      const { lname } = surveyData[0];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronicConditionHypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings__');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should return the the updated object - basic query', async () => {
    const queryParams = {
      skip: 0,
      offset: 0,
      limit: 10,
      parseColumn: 'height',
      parseParam: 'Test',
    };

    return cloudFunctions.basicQuery(queryParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const surveyData = jsonValues.filter((data) => data.fname === 'Greetings__');

      // properties from updated object with geolocation with 5 miles
      const { height } = surveyData[0];
      const { majorEvents } = surveyData[0];
      const { name } = surveyData[0];
      const { substance } = surveyData[0];
      const { AssessmentandEvaluationSurgical } = surveyData[0];
      const chronicConditionHypertension = surveyData[0].chronic_condition_hypertension;
      const { yearsLivedinthecommunity } = surveyData[0];
      const { latitude } = surveyData[0];
      const { longitude } = surveyData[0];
      const { fname } = surveyData[0];
      const { lname } = surveyData[0];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronicConditionHypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings__');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should remove the original posted object', async () => {
    const removeParams = {
      parseClass: 'SurveyData',
      objectIDinparseClass: postID1,
    };

    return cloudFunctions.removeObjectsinClass(removeParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      expect(jsonValues.objectId).toEqual(postID1);
      expect(result).toBeDefined();
    });
  });
});
