/* global Parse */
/* eslint no-undef: "error" */

const classes = require('./src/classes');
const services = require('./src/services');

Parse.Cloud.define('hello', (request, response) => new Promise((resolve) => {
  response.success(resolve('Hello world!'));
}));


/** ******************************************
GENERIC QUERY
******************************************* */
Parse.Cloud.define('genericQuery', (request, response) => {
  const model = classes.patient.ParseClass;
  const service = services.batch;
  console.log(model);
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
Parse.Cloud.define('basicQuery', (request, response) => {
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
Parse.Cloud.define('geoQuery', (request, response) => {
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

/** ******************************************
POST OBJECTS TO CLASS
Input Paramaters:
  parseClass - Class to post the object to
  photoFile - photo of the member profile that submits the POST
  signature - signature of the member profile that submits the POST
  localObject - Continas key value pairs that will be posted to the class
              - this contains a latitude/longitude which will post the location
******************************************* */
Parse.Cloud.define('postObjectsToClass', (request, response) => new Promise((resolve, reject) => {
  const SurveyData = Parse.Object.extend(request.params.parseClass);
  const surveyPoint = new SurveyData();
  let parseFilePhoto;
  let parseFileSignature;

  if (request.params.photoFile) {
    parseFilePhoto = new Parse.File('memberProfPic.png', { base64: request.params.photoFile });

    // put this inside if {
    parseFilePhoto.save().then(() => {
      // The file has been saved to Parse.
    }, (error) => {
      // The file either could not be read, or could not be saved to Parse.
      console.log(error);
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
      console.log(error);
    });

    surveyPoint.set('signature', parseFileSignature);
  }

  // add key/value from the local object to SurveyPoint
  const { localObject } = request.params;
  for (const key in localObject) {
    const obj = localObject[key];
    surveyPoint.set(String(key), obj);
  }

  // Add GeoPoint location
  const point = new Parse.GeoPoint(localObject.latitude, localObject.longitude);
  surveyPoint.set('location', point);

  surveyPoint.save().then((results) => {
    console.log(surveyPoint);
    response.success(resolve(results));
  }, (error) => {
    console.log(error);
    response.error(reject(error));
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
Parse.Cloud.define('postObjectsToClassWithRelation', (request, response) => new Promise((resolve, reject) => {
  const Child = Parse.Object.extend(request.params.parseClass);
  const Parent = Parse.Object.extend(request.params.parseParentClass);

  const child = new Child();
  const parent = new Parent();

  // Create child points
  const { localObject } = request.params;
  for (const key in localObject) {
    const obj = localObject[key];
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
}));

/** ******************************************
REMOVE OBJECTS
Input Paramaters:
  parseClass - Class to remove the object from
  objectIDinparseClass - object to remove from the parseClass
******************************************* */
Parse.Cloud.define('removeObjectsinClass', (request, response) => new Promise((resolve, reject) => {
  const yourClass = Parse.Object.extend(request.params.parseClass);
  const query = new Parse.Query(yourClass);

  query.get(request.params.objectIDinparseClass).then((results) => {
    // log object and destroy
    console.log(results);
    results.destroy({});
    response.success(resolve(results));
  }, (error) => {
    // object not found
    response.error(reject(error));
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
Parse.Cloud.define('postObjectsToAnyClassWithRelation', (request, response) => new Promise((resolve, reject) => {
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

  // arrays filled with data points for each class
  const vitalsArr = ['height', 'weight', 'bmi', 'temp', 'pulse', 'respRate', 'bloodPressure',
    'bloodOxygen', 'bloodSugar', 'painLevels', 'hemoglobinLevels'];

  const historyMedicalArr = ['majorEvents', 'surgeryWhatKind', 'medicalIllnesses', 'whenDiagnosed',
    'whatDoctorDoyousee', 'treatment', 'refill', 'familyhistory', 'preventativeCare', 'allergies'];

  const prescriptionsArr = ['name', 'dose', 'administerRoute', 'frequency', 'quantity', 'provider', 'refill',
    'startdatePerscription', 'enddatePerscription', 'dateDispense', 'type', 'instructions'];

  const allergiesArr = ['substance', 'reaction', 'category', 'severity', 'informationsource',
    'onset', 'comments'];

  // does not include user and organization from evaluationSurgical
  const evaluationSurgicalArr = ['AssessmentandEvaluationSurgical', 'planOfActionSurgical', 'notesSurgical'];

  // does not include user and organization either
  const evaluationMedicalArr = ['chronic_condition_hypertension', 'chronic_condition_diabetes',
    'chronic_condition_other', 'seen_doctor', 'received_treatment_notes', 'received_treatment_description',
    'part_of_body', 'part_of_body_description', 'duration', 'trauma_induced', 'condition_progression', 'pain',
    'notes', 'AssessmentandEvaluation', 'AssessmentandEvaluation_Surgical', 'AssessmentandEvaluation_Surgical_Guess',
    'planOfAction', 'immediate_follow_up', 'needsAssessmentandEvaluation'];

  const environmentalHealthArr = ['yearsLivedinthecommunity', 'yearsLivedinThisHouse', 'waterAccess', 'typeofWaterdoyoudrink',
    'bathroomAccess', 'latrineAccess', 'clinicAccess', 'conditionoFloorinyourhouse', 'conditionoRoofinyourhouse',
    'stoveType', 'medicalproblemswheredoyougo', 'dentalproblemswheredoyougo', 'biggestproblemofcommunity',
    'timesperweektrashcollected', 'wheretrashleftbetweenpickups', 'numberofIndividualsLivingintheHouse',
    'numberofChildrenLivinginHouseUndertheAgeof5', 'houseownership'];

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
  for (const key in localObject) {
    const obj = localObject[key];
    if (vitalsArr.includes(String(key)) && vitalsObj === false) {
      vitals = new Vitals();
      vitals.set(String(key), obj);
      vitalsObj = true;
    } else if (vitalsArr.includes(String(key))) {
      vitals.set(String(key), obj);
    } else if (historyMedicalArr.includes(String(key)) && historyMedicalObj === false) {
      historyMedical = new HistoryMedical();
      historyMedical.set(String(key), obj);
      historyMedicalObj = true;
    } else if (historyMedicalArr.includes(String(key))) {
      historyMedical.set(String(key), obj);
    } else if (prescriptionsArr.includes(String(key)) && prescriptionsObj === false) {
      prescriptions = new Prescriptions();
      prescriptions.set(String(key), obj);
      prescriptionsObj = true;
    } else if (prescriptionsArr.includes(String(key))) {
      prescriptions.set(String(key), obj);
    } else if (allergiesArr.includes(String(key)) && allergiesObj === false) {
      allergies = new Allergies();
      allergies.set(String(key), obj);
      allergiesObj = true;
    } else if (allergiesArr.includes(String(key))) {
      allergies.set(String(key), obj);
    } else if (evaluationSurgicalArr.includes(String(key)) && evaluationSurgicalObj === false) {
      evaluationSurgical = new EvaluationSurgical();
      evaluationSurgical.set(String(key), obj);
      evaluationSurgicalObj = true;
    } else if (evaluationSurgicalArr.includes(String(key))) {
      evaluationSurgical.set(String(key), obj);
    } else if (evaluationMedicalArr.includes(String(key)) && evaluationMedicalObj === false) {
      evaluationMedical = new EvaluationMedical();
      evaluationMedical.set(String(key), obj);
      evaluationMedicalObj = true;
    } else if (evaluationMedicalArr.includes(String(key))) {
      evaluationMedical.set(String(key), obj);
    } else if (environmentalHealthArr.includes(String(key)) && environmentalHealthObj === false) {
      environmentalHealth = new EnvironmentalHealth();
      environmentalHealth.set(String(key), obj);
      environmentalHealthObj = true;
    } else if (environmentalHealthArr.includes(String(key))) {
      environmentalHealth.set(String(key), obj);
    }
  }

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
      response.success(resolve(results));
    }, (error) => {
      response.error(reject(error));
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
Parse.Cloud.define('updateObject', (request, response) => new Promise((resolve, reject) => {
  const parseClass = Parse.Object.extend(request.params.parseClass);
  const query = new Parse.Query(parseClass);

  // get the object that needs to be updated
  query.get(request.params.parseClassID).then((result) => {
    // update object with new attributes
    const { localObject } = request.params;
    for (const key in localObject) {
      const obj = localObject[key];
      result.set(String(key), obj);
    }
    return result;
  }).then((result) =>
  // save the object
    result.save()).then((result) => {
    // object updated and saved
    response.success(resolve(result));
  }, (error) => {
    // error
    response.error(reject(error));
  });
}));


/** ******************************************
SIGN UP
Receives user attributes and registers user
Should send notification to admin (To be in=mplemented)

Input Paramaters:
  firstname - user's first name
  lastname - user's last name
  username - selectd username for the user
  email - email address for the user
  orginzation - nonprofit user belogns to
  role - role of user within organization
******************************************* */
Parse.Cloud.define('signup', (request, response) => new Promise((resolve, reject) => {
  const user = new Parse.User();
  user.set('firstname', String(request.params.firstname));
  user.set('lastname', String(request.params.lastname));
  user.set('username', String(request.params.username));
  user.set('password', String(request.params.password));
  user.set('email', String(request.params.email));
  user.set('orginization', String(request.params.orginization));
  user.set('role', String(request.params.role));
  user.set('adminVerified', false);

  user.signUp().then((result) => {
    console.log(`User created successfully with name ${result.get('username')} and email: ${result.get('email')}`);
    response.success(resolve(result));
  }, (error) => {
    console.log(`Error: ${error.code} ${error.message}`);
    response.error(reject(error));
  });
}));

/** ******************************************
SIGN IN
Signs a user in with given username and password
Will also check the email to see if that is being used

Input Paramaters:
  username - selected username for the user
  password - user password
******************************************* */
Parse.Cloud.define('signin', (request, response) => new Promise((resolve, reject) => {
  Parse.User.logIn(String(request.params.username), String(request.params.password)).then((result) => {
    console.log(`User logged in successful with username: ${result.get('username')}`);
    response.success(resolve(result));
  }, (error) => {
    // If the user inputs their email instead of the username
    // attempt to get the username
    console.log('Trying to use email instead of Username');
    const userQuery = new Parse.Query(Parse.User);

    userQuery.equalTo('email', request.params.username);
    userQuery.first().then((success) => {
      const { username } = success.toJSON();
      Parse.User.logIn(username, String(request.params.password)).then((result) => {
        console.log(`User logged in successful with email: ${result.get('email')}`);
        response.success(resolve(result));
      }, (error) => {
        console.log(`Error: ${error.code} ${error.message}`);
        response.error(reject(error));
      });
    }, (error) => {
      console.log(`Error: ${error.code} ${error.message}`);
      response.error(reject(error));
    });
  });
}));

/** ******************************************
SIGN OUT
Attempts to log a user out and display success/reject message

Input Paramaters:
  none
******************************************* */
Parse.Cloud.define('signout', (request, response) => new Promise((resolve, reject) => {
  Parse.User.logOut().then((result) => {
    console.log('User successfully logged out');
    response.success(resolve(result));
  }, (error) => {
    console.log(`Error: ${error.code} ${error.message}`);
    response.error(reject(error));
  });
}));

/** ******************************************
FORGOT PASSWORD
Recevies a user email address and immediately send out a
reset email link to the user.

Input Paramaters:
  email - user's email associated with the account
******************************************* */
Parse.Cloud.define('forgotPassword', (request, response) => new Promise((resolve, reject) => {
  Parse.User.requestPasswordReset(String(request.params.email)).then(() => {
    console.log('Password reset request was sent successfully');
    response.success(resolve('Success'));
  }, (error) => {
    console.log(`Error: ${error.code} ${error.message}`);
    response.error(reject(error));
  });
}));

/** ******************************************
CURRENT USER
captures the cached current user object to avoid having to
log back in every time

Input Paramaters:
  none
******************************************* */
Parse.Cloud.define('currentUser', () => {
  const u = Parse.User.current();

  if (user) {
    var user = new User();
    user.id = u.id;
    user.name = u.get('username');
    user.email = u.get('email');
    user.organization = u.get('organization');
    user.role = u.get('role');
    return user;
  }
  return null;
});
