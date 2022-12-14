const cloneDeep = require('lodash/cloneDeep');
const classes = require('../classes');
const modules = require('../module');
const services = require('../services');
const utils = require('../_utils');


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
  const model = request.params.ParseClass !== undefined ? request.params.ParseClass : classes.patient.ParseClass; // eslint-disable-line
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
Parse.Cloud.define('postObjectsToClass', (request) => {
  const {
    photoFile,
    signature,
    localObject,
    parseUser,
    parseClass,
  } = request.params;

  if (!Object.keys(request.params).length) {
    const err = 'Error: no request params';
    modules.Error.logError(err);
    return err;
  }

  const surveyPoint = new Parse.Object(parseClass);

  if (photoFile) {
    const parseFilePhoto = new Parse.File('memberProfPic.png', { base64: photoFile });

    parseFilePhoto.save().then(() => {
    }, (error) => {
      console.log(error); // eslint-disable-line
    });

    surveyPoint.set('picture', parseFilePhoto);
  }

  if (signature) {
    const parseFileSignature = new Parse.File('signature.png', { base64: signature });

    parseFileSignature.save().then(() => {
    }, (error) => {
      console.error(error); // eslint-disable-line
    });

    surveyPoint.set('signature', parseFileSignature);
  }

  Object.keys(localObject).forEach((key) => {
    const obj = localObject[key];
    surveyPoint.set(String(key), obj);
  });

  if (localObject.latitude && localObject.longitude) {
    const point = new Parse.GeoPoint(localObject.latitude, localObject.longitude);
    surveyPoint.set('location', point);
  }

  if (parseUser) {
    const userObject = new Parse.Object('_User');
    userObject.id = String(parseUser);
    surveyPoint.set('parseUser', userObject);
  }

  try {
    const survey = surveyPoint.save().then((result) => result).catch((error) => {
      const err = `Error: postObjectsToClass ${error}`;
      modules.Error.logError(err);
    });
    return survey;
  } catch (error) {
    const err = `Error: postObjectsToClass ${error}`;
    modules.Error.logError(err);
    return error;
  }
});

/** ******************************************
  POST OBJECTS TO CLASS WITH RELATION
  Input Paramaters:
    parseClass - Class to post the object to
    parseParentClass - Class to associate the parseClass with
    localObject - Continas key value pairs that will be posted to the class
                - this contains a latitude/longitude which will post the location
    parseParentClassID - ID of the parseParentClass Object to associate the new post with
    loopParentID - Custom Form that the looped form originates from
    loop - bool t/f whether looped data contained in form
  ******************************************* */
Parse.Cloud.define('postObjectsToClassWithRelation', (request) => new Promise((resolve, reject) => {
  const {
    parseParentClass,
    parseParentClassID,
    parseClass,
    localObject,
    loop,
    loopParentID,
    parseUser,
  } = request.params;

  const supplementaryForm = new Parse.Object(parseClass);
  const residentIdForm = new Parse.Object(parseParentClass);
  const userObject = new Parse.Object('_User');
  const loopParentForm = new Parse.Object(parseClass);

  // Create supplementaryForm points
  // Create looped json to ensure that data is submitted as multiple forms
  let loopedJson = {};
  let newFieldsArray = [];
  Object.keys(localObject).forEach((key) => {
    const value = localObject[key];
    if (key !== 'photoFile') {
      if (loop === true && String(key) === 'fields') {
        [loopedJson, newFieldsArray] = utils.Loop.buildLoopFieldsParameter(value,
          key, supplementaryForm, loopedJson, newFieldsArray);
      } else {
        supplementaryForm.set(String(key), value);
      }
    } else {
      const photoFileLocalObject = new Parse.File('picture.png', { base64: value });
      photoFileLocalObject.save().then(() => {
      }, (error) => {
        console.log(error); // eslint-disable-line
      });
      supplementaryForm.set(String(key), photoFileLocalObject);
    }
  });

  // Add the residentIdForm as a value in the supplementaryForm
  residentIdForm.id = String(parseParentClassID);

  supplementaryForm.set('client', residentIdForm);

  if (loopParentID) {
    loopParentForm.id = String(loopParentID);
    supplementaryForm.set('loopClient', loopParentForm);
  }

  if (parseUser) {
    userObject.id = String(parseUser);
    supplementaryForm.set('parseUser', userObject);
  }

  try {
    const survey = supplementaryForm.save().then((result) => result).then(async (mainObject) => {
      if (loop === true && Object.keys(loopedJson).length > 0) {
        await utils.Loop.postLoopedForm(loopedJson, newFieldsArray, request.params, mainObject)
          .then((result) => result)
          .catch((error) => {
            const err = `Error: loopedForm ${error}`;
            modules.Error.logError(err);
          });
      }
      return mainObject;
    }).catch((error) => {
      const err = `Error: postObjectsToClassWithRelation ${error}`;
      modules.Error.logError(err);
    });

    return resolve(survey);
  } catch (error) {
    modules.Error.logError(error);
    return reject(error);
  }
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
  Object.keys(localObject).forEach((key) => {
    const object = localObject[key];

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
    Object.keys(localObject).forEach((key) => {
      const obj = localObject[key];
      result.set(String(key), obj);
    });

    // Add GeoPoint location
    if (localObject.latitude) {
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

function postOfflineRequest(request) {
  return new Promise((resolve, reject) => {
    const offlineFormRequest = new Parse.Object('offlineFormRequest');
    offlineFormRequest.set('suveyingUser', request.params.surveyingUser);
    offlineFormRequest.set('surveyingOrganization', request.params.surveyingOrganization);
    if (request.params.parseUser) {
      const userObject = new Parse.Object('_User');
      userObject.id = String(request.params.parseUser);
      offlineFormRequest.set('parseUser', userObject);
    }

    offlineFormRequest.set('forms', {
      surveyData: request.params.surveyData,
      supForms: request.params.supForms,
      households: request.params.households,
      householdsRelation: request.params.householdsRelation,
      assetIdForms: request.params.assetIdForms,
      assetSupForms: request.params.assetSupForms,
    });

    offlineFormRequest.set('appVersion', request.params.appVersion);
    offlineFormRequest.set('phoneOS', request.params.phoneOS);
    offlineFormRequest.save().then((results) => {
      resolve(results);
    }, (error) => {
      reject(error);
    });
  });
}

function postOfflineForm(request) {
  return new Promise((resolve, reject) => {
    const offlineForm = new Parse.Object('offlineForm');
    offlineForm.set('suveyingUser', request.surveyingUser);
    offlineForm.set('surveyingOrganization', request.surveyingOrganization);
    if (request.parseUser) {
      const userObject = new Parse.Object('_User');
      userObject.id = String(request.parseUser);
      offlineForm.set('parseUser', userObject);
    }
    offlineForm.set('ParseClass', request.parseClass);

    const offlineFormRequest = new Parse.Object('offlineFormRequest');
    offlineFormRequest.id = String(request.offlineFormRequestId);
    offlineForm.set('offlineRequest', offlineFormRequest);
    offlineForm.set('localObject', request.localObject);
    offlineForm.save().then((results) => {
      resolve(results);
    }, (error) => {
      reject(error);
    });
  });
}

Parse.Cloud.define('postOfflineForms', (request) => new Promise((resolve, reject) => {
  postOfflineRequest(request).then((offlineFormRequest) => {
    const {
      surveyData, supForms, households,
      householdsRelation, assetIdForms,
      assetSupForms, surveyingUser, surveyingOrganization,
      parseUser,
    } = request.params;
    const offlineRequestId = JSON.parse(JSON.stringify(offlineFormRequest)).objectId;
    if (surveyData) {
      surveyData.forEach((idForm) => {
        const idParams = idForm;
        idParams.surveyingUser = surveyingUser;
        idParams.surveyingOrganization = surveyingOrganization;
        idParams.offlineFormRequestId = offlineRequestId;
        postOfflineForm(idParams).then(() => {}, (error) => reject(error));
      });
    }
    if (supForms) {
      supForms.forEach((supForm) => {
        const supParams = supForm;
        supParams.surveyingUser = surveyingUser;
        supParams.surveyingOrganization = surveyingOrganization;
        supParams.offlineFormRequestId = offlineRequestId;
        postOfflineForm(supParams).then(() => {}, (error) => reject(error));
      });
    }
    if (households) {
      households.forEach((household) => {
        const householdParams = household;
        householdParams.surveyingUser = surveyingUser;
        householdParams.surveyingOrganization = surveyingOrganization;
        householdParams.offlineFormRequestId = offlineRequestId;
        householdParams.parseUser = parseUser;
        postOfflineForm(householdParams).then(() => {}, (error) => reject(error));
      });
    }
    if (householdsRelation) {
      householdsRelation.forEach((householdRelation) => {
        const householdRelationParams = householdRelation;
        householdRelationParams.surveyingUser = surveyingUser;
        householdRelationParams.surveyingOrganization = surveyingOrganization;
        householdRelationParams.offlineFormRequestId = offlineRequestId;
        householdRelationParams.parseUser = parseUser;
        postOfflineForm(householdRelationParams).then(() => {}, (error) => reject(error));
      });
    }
    if (assetIdForms) {
      assetIdForms.forEach((assetID) => {
        const assetIdParams = assetID;
        assetIdParams.surveyingUser = surveyingUser;
        assetIdParams.surveyingOrganization = surveyingOrganization;
        assetIdParams.offlineFormRequestId = offlineRequestId;
        postOfflineForm(assetIdParams).then(() => {}, (error) => reject(error));
      });
    }
    if (assetSupForms) {
      assetSupForms.forEach((assetSup) => {
        const assetSupParams = assetSup;
        assetSupParams.surveyingUser = surveyingUser;
        assetSupParams.surveyingOrganization = surveyingOrganization;
        assetSupParams.offlineFormRequestId = offlineRequestId;
        postOfflineForm(assetSupParams).then(() => {}, (error) => reject(error));
      });
    }
    // Post all resident offline data
    // Deep copies needed to ensure no double submission when Parent objects' objectID
    // changes from offline object ID like 'PatientId-xxxxxx' to Parse object ID
    utils.Offline.Household.postHouseholds(households, householdsRelation,
      surveyData, supForms).then(() => {
      const householdsRelationCopy1 = cloneDeep(householdsRelation);
      const idFormsCopy1 = cloneDeep(surveyData);
      const supFormsCopy1 = cloneDeep(supForms);
      utils.Offline.HouseholdRelation.postHouseholdRelations(householdsRelationCopy1,
        idFormsCopy1, supFormsCopy1)
        .then(() => {
          const idFormsCopy2 = cloneDeep(surveyData);
          const supFormsCopy2 = cloneDeep(supForms);
          utils.Offline.Forms.postForms(idFormsCopy2, supFormsCopy2).then(() => {
            const supFormsCopy3 = cloneDeep(supForms);
            utils.Offline.Forms.postSupForms(supFormsCopy3, 'PatientID-').then(() => {
            }, (error) => {
              reject(error);
            });
          }, (error) => {
            reject(error);
          });
        }, (error) => {
          reject(error);
        });
    }, (error) => {
      reject(error);
    });

    // Post asset offline data
    utils.Offline.Forms.postForms(assetIdForms, assetSupForms).then(() => {
      utils.Offline.Forms.postSupForms(assetSupForms, 'AssetID-').then(() => {
        resolve(true);
      }, (error) => {
        reject(error);
      });
    }, (error) => {
      reject(error);
    });
  }, (error) => {
    reject(error);
  });
}));
