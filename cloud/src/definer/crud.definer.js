const classes = require('../classes');
const services = require('../services');

/** ******************************************
GENERIC QUERY
******************************************* */
Parse.Cloud.define('genericQuery', () => {
  const model = classes.patient.ParseClass;
  const service = services.batch;
  return service.genericQuery(model);
});

/** ******************************************
  BASIC QUERY
  Input Paramaters:
    parseObject - Class to search
    parseColumn - Column to search for values
    parseParam - value to be searched in columns
    limit - max number of records to return
    offset - number of records to skip when returned
  ******************************************* */
Parse.Cloud.define('basicQuery', (request) => {
  const model = classes.patient.ParseClass;
  const service = services.batch;
  return service.basicQuery(
    model,
    request.params.offset,
    request.params.limit,
    request.params.parseColumn,
    request.params.parseParam,
  );
});

/** ******************************************
  GEO QUERY
  Input Paramaters:
    parseColumn - Column to search for values
    parseParam - value to be searched in columns
    limit - max number of records to return
    lat/long - latitude/longitude, query results will always be within 5 miles of these values
  ******************************************* */
Parse.Cloud.define('geoQuery', (request) => {
  const model = classes.patient.ParseClass;
  const service = services.batch;
  return service.geoQuery(
    model,
    request.params.lat,
    request.params.long,
    request.params.limit,
    request.params.parseColumn,
    request.params.parseParam,
  );
});

/**
  * Performs a query based on the parameter defined in a column
  *
  * @example
  * countService(SurveyData,surveyingUser,Jeff)
  *
  * @param {string} parseModel Name of Backend Model
  * @param {string} parseColumn Name of Column in Backend Model
  * @param {string} parseParam Name of Parameter in Column
  * @returns Count of Query
  */
Parse.Cloud.define('countService', (request) => {
  const model = classes.patient.ParseClass;
  const service = services.batch;
  return service.countService(
    model,
    request.params.parseColumn,
    request.params.parseParam,
  );
});

/** ******************************************
  POST OBJECTS TO CLASS
  Input Paramaters:
    parseClass - Class to post the object to
    photoFile - photo of the member profile that submits the POST
    signature - signature of the member profile that submits the POST
    localObject - Continas key value pairs that will be posted to the class
                - this contains a latitude/longitude which will post the location
  ******************************************* */
Parse.Cloud.define('postObjectsToClass', (request) => new Promise((resolve, reject) => {
  const surveyPoint = new Parse.Object(request.params.parseClass);
  const userObject = new Parse.Object('_User');

  let parseFilePhoto;
  let parseFileSignature;

  if (request.params.photoFile) {
    parseFilePhoto = new Parse.File('memberProfPic.png', { base64: request.params.photoFile });

    // put this inside if {
    parseFilePhoto.save().then(() => {
      // The file has been saved to Parse.
    }, (error) => {
      // The file either could not be read, or could not be saved to Parse.
      console.log(error); // eslint-disable-line
    });

    surveyPoint.set('picture', parseFilePhoto);
  }

  if (request.params.signature) {
    parseFileSignature = new Parse.File('signature.png', { base64: request.params.signature });

    // put this inside if {
    parseFileSignature.save().then(() => {
      // The file has been saved to Parse.
    }, (error) => {
      // The file either could not be read, or could not be saved to Parse.
      console.log(error); // eslint-disable-line
    });

    surveyPoint.set('signature', parseFileSignature);
  }

  // add key/value from the local object to SurveyPoint
  const { localObject } = request.params;
  localObject.forEach((key) => {
    const obj = localObject[key];
    surveyPoint.set(String(key), obj);
  });

  // Add GeoPoint location
  const point = new Parse.GeoPoint(localObject.latitude, localObject.longitude);
  surveyPoint.set('location', point);

  if (request.params.parseUser) {
    userObject.id = String(request.params.parseUser);
    surveyPoint.set('parseUser', userObject);
  }

  surveyPoint.save().then((results) => {
    resolve(results);
  }, (error) => {
    reject(error);
  });
}));

/** ******************************************
  POST OBJECTS TO CLASS WITH RELATION
  Input Paramaters:
    parseClass - Class to post the object to
    parseParentClass - Class to associate the parseClass with
    localObject - Continas key value pairs that will be posted to the class
                - this contains a latitude/longitude which will post the location
    parseParentClassID - ID of the parseParentClass Object to associate the new post with
  ******************************************* */
Parse.Cloud.define('postObjectsToClassWithRelation', (request) => new Promise((resolve, reject) => {
  const supplementaryForm = new Parse.Object(request.params.parseClass);
  const residentIdForm = new Parse.Object(request.params.parseParentClass);
  const userObject = new Parse.Object('_User');

  // Create supplementaryForm points
  const { localObject } = request.params;
  localObject.forEach((key) => {
    const obj = localObject[key];
    if (!obj.includes('data:image/jpg;base64,')) {
      supplementaryForm.set(String(key), obj);
    } else {
      const photoFileLocalObject = new Parse.File('picture.png', { base64: obj });
      // put this inside if {
      photoFileLocalObject.save().then(() => {
        // The file has been saved to Parse.
      }, (error) => {
        // The file either could not be read, or could not be saved to Parse.
        console.log(error); // eslint-disable-line
      });
      supplementaryForm.set(String(key), photoFileLocalObject);
    }
  });

  // Add the residentIdForm as a value in the supplementaryForm
  residentIdForm.id = String(request.params.parseParentClassID);

  supplementaryForm.set('client', residentIdForm);
  if (request.params.parseUser) {
    userObject.id = String(request.params.parseUser);
    supplementaryForm.set('parseUser', userObject);
  }

  supplementaryForm.save().then((results) => {
    resolve(results);
  }, (error) => {
    reject(error);
  });
}));

/** ******************************************
  REMOVE OBJECTS
  Input Paramaters:
    parseClass - Class to remove the object from
    objectIDinparseClass - object to remove from the parseClass
  ******************************************* */
Parse.Cloud.define('removeObjectsinClass', (request) => new Promise((resolve, reject) => {
  const yourClass = Parse.Object.extend(request.params.parseClass);
  const query = new Parse.Query(yourClass);

  query.get(request.params.objectIDinparseClass).then((results) => {
    // log object and destroy
    console.log(results); // eslint-disable-line
    results.destroy({});
    resolve(results);
  }, (error) => {
    // object not found
    reject(error);
  });
}));

/** ******************************************
  POST OBJECT TO ANY CLASS WITH RELATION
  Takes objects to post to a variety of classes and post them to their
  corresponding class with a relation to the parent (SurveyData)

  Input Paramaters:
    parseParentClass - parent class to post objects to ("SurveyData")
    parseParentClassID - ID of parent class
    localObject - Continas key value pairs that will be sorted and posted
                  to the correct class (Vitals, HistoryMedical, prescriptions,
                  Allergies, EvaluationSurgical, EvaluationMedical, HistoryEnvironmental)
  ******************************************* */
Parse.Cloud.define('postObjectsToAnyClassWithRelation', (request) => new Promise((resolve, reject) => {
  const Parent = Parse.Object.extend(request.params.parseParentClass);
  const Vitals = Parse.Object.extend('Vitals');
  const HistoryMedical = Parse.Object.extend('HistoryMedical');
  const Prescriptions = Parse.Object.extend('Prescriptions');
  const Allergies = Parse.Object.extend('Allergies');
  const EvaluationSurgical = Parse.Object.extend('EvaluationSurgical');
  const EvaluationMedical = Parse.Object.extend('EvaluationMedical');
  const EnvironmentalHealth = Parse.Object.extend('HistoryEnvironmentalHealth');

  const parent = new Parent();

  // create variables but do not define as Parse Class
  // until there is an object to add
  let vitals;
  let historyMedical;
  let prescriptions;
  let allergies;
  let evaluationSurgical;
  let evaluationMedical;
  let environmentalHealth;

  let vitalsObj = false;
  let historyMedicalObj = false;
  let prescriptionsObj = false;
  let allergiesObj = false;
  let evaluationSurgicalObj = false;
  let evaluationMedicalObj = false;
  let environmentalHealthObj = false;

  // add variables in the local object to the correct child class
  // create the Parse object if it is the first variable added to the
  // object
  const { localObject } = request.params;
  localObject.forEach((i) => {
    const object = localObject[i];

    if (object.tag === 'Vitals') {
      if (vitalsObj === false) {
        vitals = new Vitals();
        vitalsObj = true;
      }
      vitals.set(String(object.key), object.value);
    } else if (object.tag === 'HistoryMedical') {
      if (historyMedicalObj === false) {
        historyMedical = new HistoryMedical();
        historyMedicalObj = true;
      }
      historyMedical.set(String(object.key), object.value);
    } else if (object.tag === 'Prescriptions') {
      if (prescriptionsObj === false) {
        prescriptions = new Prescriptions();
        prescriptionsObj = true;
      }
      prescriptions.set(String(object.key), object.value);
    } else if (object.tag === 'Allergies') {
      if (allergiesObj === false) {
        allergies = new Allergies();
        allergiesObj = true;
      }
      allergies.set(String(object.key), object.value);
    } else if (object.tag === 'EvaluationSurgical') {
      if (evaluationSurgicalObj === false) {
        evaluationSurgical = new EvaluationSurgical();
        evaluationSurgicalObj = true;
      }
      evaluationSurgical.set(String(object.key), object.value);
    } else if (object.tag === 'EvaluationMedical') {
      if (evaluationMedicalObj === false) {
        evaluationMedical = new EvaluationMedical();
        evaluationMedicalObj = true;
      }
      evaluationMedical.set(String(object.key), object.value);
    } else if (object.tag === 'HistoryEnvironmentalHealth') {
      if (environmentalHealthObj === false) {
        environmentalHealth = new EnvironmentalHealth();
        environmentalHealthObj = true;
      }
      environmentalHealth.set(String(object.key), object.value);
    }
  });

  // store the Parse objects that were asspciated with local object
  const arr = [];

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

  if (prescriptionsObj) {
    parent.id = String(request.params.parseParentClassID);
    prescriptions.set('client', parent);
    arr.push(prescriptions.save());
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
      resolve(results);
    }, (error) => {
      reject(error);
    });
}));

/** ******************************************
  UPDATE OBJECT
  Receives an objectID and then updates the corresponding
  objectID with the new key/value pairs

  Input Paramaters:
    parseClass - parse class that need to be updated
    parseClassID - ID of object to be updated
    localObject - Continas key value pairs that will be updated
  ******************************************* */
Parse.Cloud.define('updateObject', (request) => new Promise((resolve, reject) => {
  const parseClass = Parse.Object.extend(request.params.parseClass);
  const query = new Parse.Query(parseClass);

  // get the object that needs to be updated
  query.get(request.params.parseClassID).then((result) => {
    // update object with new attributes
    const { localObject } = request.params;
    localObject.forEach((key) => {
      const obj = localObject[key];
      result.set(String(key), obj);
    });
    // Add GeoPoint location
    if (localObject.latitude && localObject.longitude) {
      const point = new Parse.GeoPoint(localObject.latitude, localObject.longitude);
      result.set('location', point);
    }

    return result;
  }).then((result) => result.save()).then((result) => {
    // object updated and saved
    resolve(result);
  }, (error) => {
    // error
    reject(error);
  });
}));
