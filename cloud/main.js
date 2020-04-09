'use strict';


const Patient = require('./classes/patient.js')
const Query = require('./functions/aggregate.js')
//added not sure if it is needed
// var Parse = require("parse/node");

Parse.Cloud.define("hello", function (request, response) {
  return new Promise((resolve, reject) => {
    response.success(resolve("Hello world!"));
  });
});

Parse.Cloud.define("retrievePatientRecordsAll", async function (request, response) {
  let patient = new Patient();

  try {
    patient.retrieveAllPatients().then((results) => {
      response.success(results);
    })
  }
  catch (error) {
    console.log(response.error(error));
  }
});

Parse.Cloud.define("", function (request, response) {

  return new Promise((resolve, reject) => {

  })
})
//TO REFACTOR
Parse.Cloud.define("retrievePatientRecordByOrganization", function (request, response) {
  return new Promise((resolve, reject) => {
    var PatientDemographics = Parse.Object.extend("SurveyData");
    var q = new Parse.Query(PatientDemographics);
    q.limit(2000);
    q.equalTo("surveyingOrganization", request.params.organization);
    q.find().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
  });
});

Parse.Cloud.define("retrieveAllPatientsByParam", function (request, response) {
  let patient = new Patient();

  try {
    patient.retrieveAllPatientsByParam(
      request.params.offset,
      request.params.limit,
      request.params.parseColumn,
      request.params.parseParam).then((results) => {
        response.success(results);
      })
  }
  catch (error) {
    console.log(response.error(error));
  }
});

// my version of above function...
// wasnt sure if it working or not currently.
// couldnt test if it is working or not
Parse.Cloud.define("retrieveAllPatientsByParam2", function (request, response) {
  return new Promise((resolve, reject) => {
    // setTimeout(() => {
    const SurveyData = Parse.Object.extend("SurveyData");
    var query = new Parse.Query(SurveyData);
    query.skip(request.params.offset);
    query.limit(request.params.limit);
    query.equalTo(request.params.parseColumn, request.params.parseParam);
    query.find().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
    // }, 500);
  });
});

//Proto - Don't Know if works, still need to test
Parse.Cloud.define("retrieveAllFormsForPatientByPatientID", function (request, response) {
  let patient = new Patient();

  try {
    patient.retrieveAllFormsForPatientByPatientID(request.patiendID).then((results) => {
      response.success(results);
    })
  }
  catch (error) {
    console.log(response.error(error));
  }
});

// my version of above function..
// unsure if above version works
// this should work if SurveyData is correct class and patientID is correct field
// couldnt test if it is working or not
Parse.Cloud.define("retrieveAllFormsForPatientByPatientID2", function (request, response) {
  return new Promise((resolve, reject) => {
    // setTimeout(() => {
    const SurveyData = Parse.Object.extend("SurveyData");
    var query = new Parse.Query(SurveyData);
    // unsure if "patientID" is correct field to be searching
    query.equalTo("patientID", request.params.patientID);
    query.find().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
    // }, 500);
  });
});


// think its working
// currently checking if that column has a vlaue, but will basically return
// everything since NULL is a value...
// is ** equalTo ** what we want here? 90 
Parse.Cloud.define("genericQuery", function (request, response) {
  return new Promise((resolve, reject) => {
    // setTimeout(() => {
    const SurveyData = Parse.Object.extend(request.params.parseObject);
    var query = new Parse.Query(SurveyData);
    query.equalTo(request.params.parseColumn);
    query.find().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
    // }, 500);
  });
});

Parse.Cloud.define("basicQuery", function (request, response) {
  return new Promise((resolve, reject) => {
    // setTimeout(() => {
    const SurveyData = Parse.Object.extend(request.params.parseObject);
    let query = new Parse.Query(SurveyData);
    // can skip the first results by setting "skip"
    query.skip(request.params.offset);
    // limit the number of results by setting "limit"
    query.limit(request.params.limit);
    // retrieve the most recent 
    query.descending("createdAt");
    // limit results based on a class
    query.equalTo(request.params.parseColumn, request.params.parseParam);
    // searches whats in surveryPoints array
    query.find().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
    // }, 1500);
  });
});

Parse.Cloud.define("geoQuery", function (request, response) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const SurveyData = Parse.Object.extend(request.params.parseObject);
      let query = new Parse.Query(SurveyData);

      const myLocation = new Parse.GeoPoint({ latitude: request.params.lat, longitude: request.params.long });
      const sorted = true;
      query.withinMiles("location", myLocation, 5, sorted);

      query.limit(request.params.limit);
      query.descending("createdAt");
      query.equalTo(request.params.parseColumn, request.params.parseParam);

      query.find().then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
    }, 500);
  });
});

Parse.Cloud.define("postObjectsToClass", function (request, response) {
  return new Promise((resolve, reject) => {
    const SurveyData = Parse.Object.extend(request.params.parseClass);
    let surveyPoint = new SurveyData();

    if (request.params.photoFile) {
      var parseFile = new Parse.File("memberProfPic.png", { base64: request.params.photoFile });

      //put this inside if {
      parseFile.save().then(function () {
        // The file has been saved to Parse.
      }, function (error) {
        // The file either could not be read, or could not be saved to Parse.
        console.log(error)
      });

      surveyPoint.set('picture', parseFile)
    }

    if (request.params.signature) {
      var parseFile = new Parse.File("signature.png", { base64: request.params.signature });

      //put this inside if {
      parseFile.save().then(function () {
        // The file has been saved to Parse.
      }, function (error) {
        // The file either could not be read, or could not be saved to Parse.
        console.log(error)
      });

      surveyPoint.set('signature', parseFile)
    }

    // add key/value from the local object to SurveyPoint
    var localObject = request.params.localObject;
    for (var key in localObject) {
      var obj = localObject[key];
      surveyPoint.set(String(key), obj);
    }

    // Add GeoPoint location 
    var point = new Parse.GeoPoint(localObject.latitude, localObject.longitude);
    surveyPoint.set('location', point);

    surveyPoint.save().then((results) => {
      console.log(surveyPoint)
      response.success(resolve(results));
    }, (error) => {
      console.log(error);
      response.error(reject(error));
    });
  })
})

Parse.Cloud.define("postObjectsToClassWithRelation", function (request, response) {
  return new Promise((resolve, reject) => {
    const childClass = Parse.Object.extend(request.params.parseClass);
    const parentClass = Parse.Object.extend(request.params.parseParentClass);

    let child = new childClass();
    let parent = new parentClass();

    // Create child points
    var localObject = request.params.localObject;
    for (var key in localObject) {
      var obj = localObject[key];
      child.set(String(key), obj);
    }

    // Add the parent as a value in the child
    parent.id = String(request.params.parseParentClassID);
    child.set('client', parent);

    child.save().then((results) => {
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
    });
  })
})

Parse.Cloud.define("removeObjectsinClass", function (request, response) {
  return new Promise((resolve, reject) => {
    var yourClass = Parse.Object.extend(request.params.parseClass);
    var query = new Parse.Query(yourClass);

    query.get(request.params.objectIDinparseClass).then((results) => {
      // log object and destroy 
      console.log(results);
      results.destroy({});
      response.success(resolve(results));
    }, (error) => {
      // object not found
      response.error(reject(error));
    })
  });
})

