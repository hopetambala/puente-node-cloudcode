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

/********************************************
GENERIC QUERY
Input Paramaters:
  parseObject - Class to search
  parseColumn - Column to search for values
********************************************/
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

/********************************************
BASIC QUERY
Input Paramaters:
  parseObject - Class to search
  parseColumn - Column to search for values
  parseParam - value to be searched in columns
  limit - max number of records to return
  offset - number of records to skip when returned
********************************************/
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


/********************************************
GEO QUERY
Input Paramaters:
  parseObject - Class to search
  parseColumn - Column to search for values
  parseParam - value to be searched in columns
  limit - max number of records to return
  lat/long - latitude/longitude, query results will always be within 5 miles of these values
********************************************/
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

/********************************************
POST OBJECTS TO CLASS
Input Paramaters:
  parseClass - Class to post the object to
  photoFile - photo of the member profile that submits the POST
  signature - signature of the member profile that submits the POST
  localObject - Continas key value pairs that will be posted to the class
              - this contains a latitude/longitude which will post the location
********************************************/
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

/********************************************
POST OBJECTS TO CLASS WITH RELATION
Input Paramaters:
  parseClass - Class to post the object to
  parseParentClass - Class to associate the parseClass with
  localObject - Continas key value pairs that will be posted to the class
              - this contains a latitude/longitude which will post the location
  parseParentClassID - ID of the parseParentClass Object to associate the new post with
********************************************/
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

/********************************************
REMOVE OBJECTS
Input Paramaters:
  parseClass - Class to remove the object from
  objectIDinparseClass - object to remove from the parseClass
********************************************/
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



/********************************************
POST OBJECT TO ANY CLASS WITH RELATION
Takes objects to post to a variety of classes and post them to their 
corresponding class with a relation to the parent (SurveyData)

Input Paramaters:
  parseParentClass - parent class to post objects to ("SurveyData")
  parseParentClassID - ID of parent class
  localObject - Continas key value pairs that will be sorted and posted
                to the correct class (Vitals, HistoryMedical, Perscriptions,
                Allergies, EvaluationSurgical, EvaluationMedical, HistoryEnvironmental)
********************************************/
Parse.Cloud.define("postObjectsToAnyClassWithRelation", function (request, response) {
  return new Promise((resolve, reject) => {
    const parentClass = Parse.Object.extend(request.params.parseParentClass);
    const vitalsClass = Parse.Object.extend("Vitals");
    const historyMedicalClass = Parse.Object.extend("HistoryMedical");
    const perscriptionsClass = Parse.Object.extend("Prescriptions");
    const allergiesClass = Parse.Object.extend("Allergies");
    const evaluationSurgicalClass = Parse.Object.extend("EvaluationSurgical");
    const evaluationMedicalClass = Parse.Object.extend("EvaluationMedical");
    const environmentalHealthClass = Parse.Object.extend("HistoryEnvironmentalHealth");

    var parent = new parentClass();

    // create variables but do not define as Parse Class
    // until there is an object to add
    var vitals;
    var historyMedical;
    var perscriptions;
    var allergies;
    var evaluationSurgical;
    var evaluationMedical;
    var environmentalHealth;

    // arrays filled with data points for each class
    const vitalsArr = ["height", "weight", "bmi", "temp", "pulse", "respRate", "bloodPressure",
      "bloodOxygen", "bloodSugar", "painLevels", "hemoglobinLevels"];

    const historyMedicalArr = ["majorEvents", "surgeryWhatKind", "medicalIllnesses", "whenDiagnosed",
      "whatDoctorDoyousee", "treatment", "refill", "familyhistory", "preventativeCare", "allergies"];

    const perscriptionsArr = ["name", "dose", "administerRoute", "frequency", "quantity", "provider", "refill",
      "startdatePerscription", "enddatePerscription", "dateDispense", "type", "instructions"];

    const allergiesArr = ["substance", "reaction", "category", "severity", "informationsource",
      "onset", "comments"];

    // does not include user and organization from evaluationSurgical
    const evaluationSurgicalArr = ["AssessmentandEvaluationSurgical", "planOfActionSurgical", "notesSurgical"];

    // does not include user and organization either
    const evaluationMedicalArr = ["chronic_condition_hypertension", "chronic_condition_diabetes",
      "chronic_condition_other", "seen_doctor", "received_treatment_notes", "received_treatment_description",
      "part_of_body", "part_of_body_description", "duration", "trauma_induced", "condition_progression", "pain",
      "notes", "AssessmentandEvaluation", "AssessmentandEvaluation_Surgical", "AssessmentandEvaluation_Surgical_Guess",
      "planOfAction", "immediate_follow_up", "needsAssessmentandEvaluation"];

    const environmentalHealthArr = ["yearsLivedinthecommunity", "yearsLivedinThisHouse", "waterAccess", "typeofWaterdoyoudrink",
      "bathroomAccess", "latrineAccess", "clinicAccess", "conditionoFloorinyourhouse", "conditionoRoofinyourhouse",
      "stoveType", "medicalproblemswheredoyougo", "dentalproblemswheredoyougo", "biggestproblemofcommunity",
      "timesperweektrashcollected", "wheretrashleftbetweenpickups", "numberofIndividualsLivingintheHouse",
      "numberofChildrenLivinginHouseUndertheAgeof5", "houseownership"];

    let vitalsObj = false;
    let historyMedicalObj = false;
    let perscriptionsObj = false;
    let allergiesObj = false;
    let evaluationSurgicalObj = false;
    let evaluationMedicalObj = false;
    let environmentalHealthObj = false;

    // add variables in the local object to the correct child class
    // create the Parse object if it is the first variable added to the 
    // object
    var localObject = request.params.localObject;
    for (var key in localObject) {
      var obj = localObject[key];
      if (vitalsArr.includes(String(key)) && vitalsObj == false) {
        vitals = new vitalsClass();
        vitals.set(String(key), obj);
        vitalsObj = true;
      }
      else if (vitalsArr.includes(String(key))) {
        vitals.set(String(key), obj);
      }
      else if (historyMedicalArr.includes(String(key)) && historyMedicalObj == false) {
        historyMedical = new historyMedicalClass();
        historyMedical.set(String(key), obj);
        historyMedicalObj = true;
      }
      else if (historyMedicalArr.includes(String(key))) {
        historyMedical.set(String(key), obj);
      }
      else if (perscriptionsArr.includes(String(key)) && perscriptionsObj == false) {
        perscriptions = new perscriptionsClass();
        perscriptions.set(String(key), obj);
        perscriptionsObj = true;
      }
      else if (perscriptionsArr.includes(String(key))) {
        perscriptions.set(String(key), obj);
      }
      else if (allergiesArr.includes(String(key)) && allergiesObj == false) {
        allergies = new allergiesClass();
        allergies.set(String(key), obj);
        allergiesObj = true;
      }
      else if (allergiesArr.includes(String(key))) {
        allergies.set(String(key), obj);
      }
      else if (evaluationSurgicalArr.includes(String(key)) && evaluationSurgicalObj == false) {
        evaluationSurgical = new evaluationSurgicalClass();
        evaluationSurgical.set(String(key), obj);
        evaluationSurgicalObj = true;
      }
      else if (evaluationSurgicalArr.includes(String(key))) {
        evaluationSurgical.set(String(key), obj);
      }
      else if (evaluationMedicalArr.includes(String(key)) && evaluationMedicalObj == false) {
        evaluationMedical = new evaluationMedicalClass();
        evaluationMedical.set(String(key), obj);
        evaluationMedicalObj = true;
      }
      else if (evaluationMedicalArr.includes(String(key))) {
        evaluationMedical.set(String(key), obj);
      }
      else if (environmentalHealthArr.includes(String(key)) && environmentalHealthObj == false) {
        environmentalHealth = new environmentalHealthClass();
        environmentalHealth.set(String(key), obj);
        environmentalHealthObj = true;
      }
      else if (environmentalHealthArr.includes(String(key))) {
        environmentalHealth.set(String(key), obj);
      }

    }

    // store the Parse objects that were asspciated with local object
    var arr = [];

    // check if each Class had any objects added to them
    // add the parent and add save prokmise
    if (vitalsObj) {
      parent.id = String(request.params.parseParentClassID);
      vitals.set('client', parent);
      arr.push(vitals.save());
    }

    if (historyMedicalObj) {
      parent.id = String(request.params.parseParentClassID);
      historyMedical.set('client', parent);
      arr.push(historyMedical.save());
    }


    if (perscriptionsObj) {
      parent.id = String(request.params.parseParentClassID);
      perscriptions.set('client', parent);
      arr.push(perscriptions.save())
    }

    if (allergiesObj) {
      parent.id = String(request.params.parseParentClassID);
      allergies.set('client', parent);
      arr.push(allergies.save());
    }

    if (evaluationSurgicalObj) {
      parent.id = String(request.params.parseParentClassID);
      evaluationSurgical.set('client', parent);
      arr.push(evaluationSurgical.save());
    }

    if (evaluationMedicalObj) {
      parent.id = String(request.params.parseParentClassID);
      evaluationMedical.set('client', parent);
      arr.push(evaluationMedical.save());
    }

    if (environmentalHealthObj) {
      parent.id = String(request.params.parseParentClassID);
      environmentalHealth.set('client', parent);
      arr.push(environmentalHealth.save());
    }

    // save all parse objects that had any objects added
    Promise.all(arr)
      .then((results) => {
        response.success(resolve(results));
      }, (error) => {
        response.error(reject(error));
      });
  })
})

/********************************************
UPDATE OBJECT
Receives an objectID and then updates the corresponding
objectID with the new key/value pairs

Input Paramaters:
  parseClass - parse class that need to be updated
  parseClassID - ID of object to be updated
  localObject - Continas key value pairs that will be updated
********************************************/
Parse.Cloud.define("updateObject", function (request, response) {
  return new Promise((resolve, reject) => {
    const parseClass = Parse.Object.extend(request.params.parseClass);
    var query = new Parse.Query(parseClass)

    // get the object that needs to be updated
    query.get(request.params.parseClassID).then((result) => {
      // update object with new attributes
      var localObject = request.params.localObject;
      for (var key in localObject) {
        var obj = localObject[key];
        result.set(String(key), obj);
      }
      return result;
    }).then(function (result) {
      // save the object
      return result.save();
    }).then(function (result) {
      // object updated and saved
      response.success(resolve(result));
    }, (error) => {
      // error
      response.error(reject(error));
    })
  })
})

