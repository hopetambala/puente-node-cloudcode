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

describe('insert', () => {
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
  });

  it('should post object object to SurveyData', async () => {
    const postParams = {
      parseClass: 'SurveyData',
      signature: 'Test',
      photoFile: 'TestPicture',
      localObject: {
        fname: 'Greetings',
        lname: 'Tester',
      },
    };
    return cloudFunctions.postObjectsToClass(postParams).then((result) => {
      console.log(result);
      postID1 = result.id
    });
  });

  it('should return the posted results back', async () => {
    const queryParams = {
      parseObject: 'SurveyData'
    };


    return cloudFunctions.genericQuery(queryParams).then((result) => {
      console.log(result);

      // for (var i in result[0]) {
      //   console.log(i);
      //   console.log(result[0][i])
      // }
      // firstName = result[0].fname;
      // console.log(firstName);
      // expect(result[0].fname).toEqual('Greetings');
      expect(result).toBeDefined();
    });
  });

  it('should post an object with relation to original post with history medical class', async () => {
    const postParams = {
      parseClass: "HistoryMedical",
      parseParentClass: "SurveyData",
      parseParentClassID: "jSez2hFlLT",
      localObject: {
        majorEvents: null,
        surgeryWhatKind: null,
        medicalIllnesses: null,
        whenDiagnosed: null,
        whatDoctorDoyousee: null,
        treatment: null,
        familyhistory: null,
        preventativeCare: null,
        allergies: null,
        latitude: 3,
        longitude: 7
      }
    }
    return cloudFunctions.postObjectsToClassWithRelation(postParams).then((result) => {
      console.log(result);
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
        name: "JOSIAH",
        substance: "DRUG",
        AssessmentandEvaluationSurgical: "test",
        chronic_condition_hypertension: "test",
        yearsLivedinthecommunity: "TEST"
      }
    }

    return cloudFunctions.postObjectsToAnyClassWithRelation(post_params).then((result) => {
      console.log(result);
      postID3 = result[0].id;
      expect(result).toBeDefined();
    })
  })

  it('should return the posted results back', async () => {
    const queryParams = {
      parseObject: 'HistoryMedical'
    };


    return cloudFunctions.genericQuery(queryParams).then((result) => {
      console.log(result);
      // some test to see what i am getting back from the result
      // for (var i in result[0]) {
      //   console.log(i);
      //   console.log(result[0][i])
      // }
      // firstName = result[0].fname;
      // console.log(firstName);
      // expect(result[0].fname).toEqual('Greetings');
      expect(result).toBeDefined();
    });
  });

  it('should update the originally posted item', async () => {
    const update_params = {
      parseClass: "SurveyData",
      parseClassID: postID1,
      localObject: {
        height: "1231",
        majorEvents: null,
        name: "no name",
        substance: null,
        AssessmentandEvaluationSurgical: "yes",
        chronic_condition_hypertension: "no",
        yearsLivedinthecommunity: "TEST",
        latitude: 3,
        longitude: 4
      }
    }
    return cloudFunctions.updateObject(update_params).then((result) => {
      console.log(result);
      expect(result).toBeDefined();
    });
  });

  // it('should return the the updated object', async () => {
  //   const query_params = {
  //     lat: 3,
  //     long: 4,
  //     limit: 10,
  //     parseColumn: 'surveyingOrganization',
  //     parseParam: 'Test'
  //   }

  //   return cloudFunctions.geoQuery(query_params).then((result) => {
  //     console.log(result);
  //     expect(result).toBeDefined();
  //   });
  // });

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



});


