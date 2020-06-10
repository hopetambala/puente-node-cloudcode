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

// test('Post object - async', async () => {
//   // expect.assertions(1);
//   const postParams = {
//     parseClass: 'SurveyData',
//     signature: 'Joe',
//     photoFile: 'pictureofJoe',
//     localObject: {
//       fname: 'Greetings',
//       lname: 'Bouble',
//     },
//   };
//   return cloudFunctions.postObjectsToClass(postParams).then((result) => {
//     console.log(result);
//     // const queryParams = {
//     //   parseObject: 'SurveyData'
//     // };
//     // expect(cloudFunctions.genericQuery(queryParams)).toHaveProperty('signature', 'ehh')
//   });
// }, 30000);

describe('crud testing', () => {
  let connection;
  let db;
  let postID1;
  let postID2;
  let postID3;

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

  it('should post object object to SurveyData', async () => {
    const postParams = {
      parseClass: 'SurveyData',
      signature: 'Test',
      photoFile: 'TestPicture',
      localObject: {
        fname: 'Greetings',
        lname: 'Tester',
        latitude: 4,
        longitude: 5
      },
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      postID1 = result.id
    });
  });

  it('should post an object with relation to original post with history medical class', async () => {
    const postParams = {
      parseClass: "HistoryMedical",
      parseParentClass: "SurveyData",
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
        longitude: 7
      }
    }
    return cloudFunctions.postObjectsToClassWithRelation(postParams).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      let client = jsonValues['client'];
      let type = client['__type'];
      let className = client['className'];
      let objectID = client['objectId'];
      let majorEvents = jsonValues['majorEvents'];
      let surgeryWhatKind = jsonValues['surgeryWhatKind'];
      let medicalIllnesses = jsonValues['medicalIllnesses'];
      let whenDiagnosed = jsonValues['whenDiagnosed'];
      let whatDoctorDoyousee = jsonValues['whatDoctorDoyousee'];
      let treatment = jsonValues['treatment'];
      let familyhistory = jsonValues['familyhistory'];
      let preventativeCare = jsonValues['preventativeCare'];
      let allergies = jsonValues['allergies'];
      let latitude = jsonValues['latitude'];
      let longitude = jsonValues['longitude'];

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

      postID2 = result.id;
      expect(result).toBeDefined();
    });
  });

  it('should post an object to class with relation to original post with a variety of classes', async () => {
    const post_params = {
      parseParentClass: "SurveyData",
      parseParentClassID: postID1,
      localObject: {
        height: "4",
        majorEvents: null,
        name: "Greetings",
        substance: "Tester",
        AssessmentandEvaluationSurgical: "Have",
        chronic_condition_hypertension: "swell",
        yearsLivedinthecommunity: "day!"
      }
    }

    return cloudFunctions.postObjectsToAnyClassWithRelation(post_params).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      var i;
      for (i in jsonValues) {
        // ensure all are related to original surveyData form
        let client = jsonValues[i]['client'];
        let type = client['__type'];
        let className = client['className'];
        let objectID = client['objectId'];
        expect(type).toEqual('Pointer');
        expect(className).toEqual('SurveyData');
        expect(objectID).toEqual(postID1);

        // testing other attributes are correctly added
        if ('height' in jsonValues[i]) {
          let height = jsonValues[i]['height'];
          expect(height).toEqual('4');
        }
        if ('majorEvents' in jsonValues[i]) {
          let majorEvents = jsonValues[i]['majorEvents'];
          expect(majorEvents).toEqual(null);
        }
        if ('name' in jsonValues[i]) {
          let name = jsonValues[i]['name'];
          expect(name).toEqual('Greetings');
        }
        if ('substance' in jsonValues[i]) {
          let substance = jsonValues[i]['substance'];
          expect(substance).toEqual('Tester');
        }
        if ('AssessmentandEvaluationSurgical' in jsonValues[i]) {
          let AssessmentandEvaluationSurgical = jsonValues[i]['AssessmentandEvaluationSurgical'];
          expect(AssessmentandEvaluationSurgical).toEqual('Have');
        }
        if ('chronic_condition_hypertension' in jsonValues[i]) {
          let chronic_condition_hypertension = jsonValues[i]['chronic_condition_hypertension'];
          expect(chronic_condition_hypertension).toEqual('swell');
        }
        if ('yearsLivedinthecommunity' in jsonValues[i]) {
          let yearsLivedinthecommunity = jsonValues[i]['yearsLivedinthecommunity'];
          expect(yearsLivedinthecommunity).toEqual('day!');
        }
      }
      postID3 = result[0].id;
      expect(result).toBeDefined();
    })
  })

  it('should update the originally posted item', async () => {
    const update_params = {
      parseClass: "SurveyData",
      parseClassID: postID1,
      localObject: {
        height: "Test",
        majorEvents: 'this',
        name: "is.",
        substance: 'Succeed',
        AssessmentandEvaluationSurgical: "it",
        chronic_condition_hypertension: "must",
        yearsLivedinthecommunity: null,
        latitude: 3,
        longitude: 4
      }
    }
    return cloudFunctions.updateObject(update_params).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      // updated properties
      let height = jsonValues['height'];
      let majorEvents = jsonValues['majorEvents'];
      let name = jsonValues['name'];
      let substance = jsonValues['substance'];
      let AssessmentandEvaluationSurgical = jsonValues['AssessmentandEvaluationSurgical'];
      let chronic_condition_hypertension = jsonValues['chronic_condition_hypertension'];
      let yearsLivedinthecommunity = jsonValues['yearsLivedinthecommunity'];
      let latitude = jsonValues['latitude'];
      let longitude = jsonValues['longitude'];

      // properties that were not updated
      let fname = jsonValues['fname'];
      let lname = jsonValues['lname'];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);

      expect(fname).toEqual('Greetings');
      expect(lname).toEqual('Tester');

      expect(result).toBeDefined();
    });
  });

  it('should return the updated object - generic query', async () => {
    const queryParams = {
      parseObject: 'SurveyData'
    };


    return cloudFunctions.genericQuery(queryParams).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      let height = jsonValues[0]['height'];
      let majorEvents = jsonValues[0]['majorEvents'];
      let name = jsonValues[0]['name'];
      let substance = jsonValues[0]['substance'];
      let AssessmentandEvaluationSurgical = jsonValues[0]['AssessmentandEvaluationSurgical'];
      let chronic_condition_hypertension = jsonValues[0]['chronic_condition_hypertension'];
      let yearsLivedinthecommunity = jsonValues[0]['yearsLivedinthecommunity'];
      let latitude = jsonValues[0]['latitude'];
      let longitude = jsonValues[0]['longitude'];
      let fname = jsonValues[0]['fname'];
      let lname = jsonValues[0]['lname'];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should return the the updated object - geo query', async () => {
    const query_params = {
      lat: 4,
      long: 5,
      limit: 10,
      parseColumn: 'height',
      parseParam: 'Test'
    }

    return cloudFunctions.geoQuery(query_params).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      // properties from updated object with geolocation with 5 miles
      let height = jsonValues[0]['height'];
      let majorEvents = jsonValues[0]['majorEvents'];
      let name = jsonValues[0]['name'];
      let substance = jsonValues[0]['substance'];
      let AssessmentandEvaluationSurgical = jsonValues[0]['AssessmentandEvaluationSurgical'];
      let chronic_condition_hypertension = jsonValues[0]['chronic_condition_hypertension'];
      let yearsLivedinthecommunity = jsonValues[0]['yearsLivedinthecommunity'];
      let latitude = jsonValues[0]['latitude'];
      let longitude = jsonValues[0]['longitude'];
      let fname = jsonValues[0]['fname'];
      let lname = jsonValues[0]['lname'];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should return the the updated object - basic query', async () => {
    const query_params = {
      skip: 0,
      offset: 0,
      limit: 1,
      parseColumn: 'height',
      parseParam: 'Test'
    }

    return cloudFunctions.basicQuery(query_params).then((result) => {
      let jsonString = JSON.stringify(result)
      let jsonValues = JSON.parse(jsonString);
      console.log(jsonValues);

      // properties from updated object with geolocation with 5 miles
      let height = jsonValues[0]['height'];
      let majorEvents = jsonValues[0]['majorEvents'];
      let name = jsonValues[0]['name'];
      let substance = jsonValues[0]['substance'];
      let AssessmentandEvaluationSurgical = jsonValues[0]['AssessmentandEvaluationSurgical'];
      let chronic_condition_hypertension = jsonValues[0]['chronic_condition_hypertension'];
      let yearsLivedinthecommunity = jsonValues[0]['yearsLivedinthecommunity'];
      let latitude = jsonValues[0]['latitude'];
      let longitude = jsonValues[0]['longitude'];
      let fname = jsonValues[0]['fname'];
      let lname = jsonValues[0]['lname'];

      expect(height).toEqual('Test');
      expect(majorEvents).toEqual('this');
      expect(name).toEqual('is.');
      expect(substance).toEqual('Succeed');
      expect(AssessmentandEvaluationSurgical).toEqual('it');
      expect(chronic_condition_hypertension).toEqual('must');
      expect(yearsLivedinthecommunity).toEqual(null);
      expect(latitude).toEqual(3);
      expect(longitude).toEqual(4);
      expect(fname).toEqual('Greetings');
      expect(lname).toEqual('Tester');
      expect(result).toBeDefined();
    });
  });

  it('should remove the posted object with relation', async () => {
    const removeParams = {
      parseClass: 'HistoryMedical',
      objectIDinparseClass: postID2
    }

    return cloudFunctions.removeObjectsinClass(removeParams).then((result) => {
      console.log(result)
      expect(result).toBeDefined();
    });
  });



  it('should remove the original posted object', async () => {
    const removeParams = {
      parseClass: 'SurveyData',
      objectIDinparseClass: postID1
    }

    return cloudFunctions.removeObjectsinClass(removeParams).then((result) => {
      console.log(result)
      expect(result).toBeDefined();
    });
  });

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



  });


