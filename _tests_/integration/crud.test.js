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

  it('should post an object with relation to original post with history medical class', async () => {
    const postParams = {
      parseClass: 'HistoryMedical',
      parseParentClass: 'SurveyData',
      parseParentClassID: postID1,
      localObject: {
        majorEvents: 'This',
        surgeryWhatKind: 'is',
        medicalIllnesses: 'a',
        whenDiagnosed: 'very',
        whatDoctorDoyousee: 'thorough',
        treatment: 'and',
        familyhistory: 'great',
        preventativeCare: 'test',
        allergies: null,
        latitude: 3,
        longitude: 7,
      },
    };
    return cloudFunctions.postObjectsToClassWithRelation(postParams).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const { client } = jsonValues;
      const type = client.__type;
      const { className } = client;
      const objectID = client.objectId;
      const { majorEvents } = jsonValues;
      const { surgeryWhatKind } = jsonValues;
      const { medicalIllnesses } = jsonValues;
      const { whenDiagnosed } = jsonValues;
      const { whatDoctorDoyousee } = jsonValues;
      const { treatment } = jsonValues;
      const { familyhistory } = jsonValues;
      const { preventativeCare } = jsonValues;
      const { allergies } = jsonValues;
      const { latitude } = jsonValues;
      const { longitude } = jsonValues;

      expect(type).toEqual('Pointer');
      expect(className).toEqual('SurveyData');
      expect(objectID).toEqual(postID1);
      expect(majorEvents).toEqual('This');
      expect(surgeryWhatKind).toEqual('is');
      expect(medicalIllnesses).toEqual('a');
      expect(whenDiagnosed).toEqual('very');
      expect(whatDoctorDoyousee).toEqual('thorough');
      expect(treatment).toEqual('and');
      expect(familyhistory).toEqual('great');
      expect(preventativeCare).toEqual('test');
      expect(allergies).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(7);

      expect(result).toBeDefined();
    });
  });

  it('should post an object to class with relation to original post with a variety of classes', async () => {
    const post_params = {
      parseParentClass: 'SurveyData',
      parseParentClassID: postID1,
      localObject: {
        height: '4',
        majorEvents: null,
        name: 'Greetings__',
        substance: 'Tester',
        AssessmentandEvaluationSurgical: 'Have',
        chronic_condition_hypertension: 'swell',
        yearsLivedinthecommunity: 'day!',
      },
    };

    return cloudFunctions.postObjectsToAnyClassWithRelation(post_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      let i;
      for (i in jsonValues) {
        // ensure all are related to original surveyData form
        const { client } = jsonValues[i];
        const type = client.__type;
        const { className } = client;
        const objectID = client.objectId;
        expect(type).toEqual('Pointer');
        expect(className).toEqual('SurveyData');
        expect(objectID).toEqual(postID1);

        // testing other attributes are correctly added
        if ('height' in jsonValues[i]) {
          const { height } = jsonValues[i];
          expect(height).toEqual('4');
        }
        if ('majorEvents' in jsonValues[i]) {
          const { majorEvents } = jsonValues[i];
          expect(majorEvents).toEqual(null);
        }
        if ('name' in jsonValues[i]) {
          const { name } = jsonValues[i];
          expect(name).toEqual('Greetings__');
        }
        if ('substance' in jsonValues[i]) {
          const { substance } = jsonValues[i];
          expect(substance).toEqual('Tester');
        }
        if ('AssessmentandEvaluationSurgical' in jsonValues[i]) {
          const { AssessmentandEvaluationSurgical } = jsonValues[i];
          expect(AssessmentandEvaluationSurgical).toEqual('Have');
        }
        if ('chronic_condition_hypertension' in jsonValues[i]) {
          const { chronic_condition_hypertension } = jsonValues[i];
          expect(chronic_condition_hypertension).toEqual('swell');
        }
        if ('yearsLivedinthecommunity' in jsonValues[i]) {
          const { yearsLivedinthecommunity } = jsonValues[i];
          expect(yearsLivedinthecommunity).toEqual('day!');
        }
      }
      expect(result).toBeDefined();
    });
  });

  it('should update the originally posted item', async () => {
    const update_params = {
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
    return cloudFunctions.updateObject(update_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      // updated properties
      const { height } = jsonValues;
      const { majorEvents } = jsonValues;
      const { name } = jsonValues;
      const { substance } = jsonValues;
      const { AssessmentandEvaluationSurgical } = jsonValues;
      const { chronic_condition_hypertension } = jsonValues;
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
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);

      expect(fname).toEqual('Greetings__');
      expect(lname).toEqual('Tester');

      expect(result).toBeDefined();
    });
  });

  // it('should return the updated object - generic query', async () => {
  //   const queryParams = {
  //     parseObject: 'SurveyData',
  //   };
    
  //   return cloudFunctions.genericQuery(queryParams).then(async(result) => {
  //     const jsonString = JSON.stringify(result);
  //     const jsonValues = JSON.parse(jsonString);

  //     const surveyData = await jsonValues.filter((surveyData) => {
  //       console.log(surveyData.fname)
  //       surveyData.fname == 'Greetings__'
  //     });

  //     const { height } = surveyData[0];
  //     const { majorEvents } = surveyData[0];
  //     const { name } = surveyData[0];
  //     const { substance } = surveyData[0];
  //     const { AssessmentandEvaluationSurgical } = surveyData[0];
  //     const { chronic_condition_hypertension } = surveyData[0];
  //     const { yearsLivedinthecommunity } = surveyData[0];
  //     const { latitude } = surveyData[0];
  //     const { longitude } = surveyData[0];
  //     const { fname } = surveyData[0];
  //     const { lname } = surveyData[0];

  //     expect(height).toEqual('Test');
  //     expect(majorEvents).toEqual('this');
  //     expect(name).toEqual('is.');
  //     expect(substance).toEqual('Succeed');
  //     expect(AssessmentandEvaluationSurgical).toEqual('it');
  //     expect(chronic_condition_hypertension).toEqual('must');
  //     expect(yearsLivedinthecommunity).toEqual(null);
  //     expect(latitude).toEqual(3);
  //     expect(longitude).toEqual(4);
  //     expect(fname).toEqual('Greetings__');
  //     expect(lname).toEqual('Tester');
  //     expect(result).toBeDefined();
  //   });
  // });

  it('should return the the updated object - geo query', async () => {
    const query_params = {
      lat: 3,
      long: 4,
      limit: 10,
      parseColumn: 'height',
      parseParam: 'Test',
    };

    return cloudFunctions.geoQuery(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const surveyData = jsonValues.filter((surveyData) => surveyData.fname == 'Greetings__');

      // properties from updated object with geolocation with 5 miles
      const { height } = surveyData[0];
      const { majorEvents } = surveyData[0];
      const { name } = surveyData[0];
      const { substance } = surveyData[0];
      const { AssessmentandEvaluationSurgical } = surveyData[0];
      const { chronic_condition_hypertension } = surveyData[0];
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
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings__');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should return the the updated object - basic query', async () => {
    const query_params = {
      skip: 0,
      offset: 0,
      limit: 10,
      parseColumn: 'height',
      parseParam: 'Test',
    };

    return cloudFunctions.basicQuery(query_params).then((result) => {
      const jsonString = JSON.stringify(result);
      const jsonValues = JSON.parse(jsonString);

      const surveyData = jsonValues.filter((surveyData) => surveyData.fname == 'Greetings__');

      // properties from updated object with geolocation with 5 miles
      const { height } = surveyData[0];
      const { majorEvents } = surveyData[0];
      const { name } = surveyData[0];
      const { substance } = surveyData[0];
      const { AssessmentandEvaluationSurgical } = surveyData[0];
      const { chronic_condition_hypertension } = surveyData[0];
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
      expect(chronic_condition_hypertension).toEqual('must');
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
