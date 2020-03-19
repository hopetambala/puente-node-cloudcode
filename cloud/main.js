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
Parse.Cloud.define("retrievePatientRecordByOrganization", function(request, response) {
  return new Promise((resolve,reject)=> {
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

