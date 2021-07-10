const { Parse } = require('parse/node');
const prompt = require('prompt');
const { toUpper } = require('lodash');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL,
} = require('./env.config');

console.log(PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL); // eslint-disable-line
if (PARSE_ENV === 'staging' || PARSE_ENV === 'prod') {
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

prompt.start();

function queryAndUpdateSurveyData(params) {
  const basicQueryParams = {
    offset: 0,
    limit: 1000000,
    parseColumn: 'surveyingOrganization',
    parseParam: params.currentValue,
  };

  Parse.Cloud.run('basicQuery', basicQueryParams).then((response) => {
      console.log(`Total objects queried: ${response.length}`); // eslint-disable-line
      console.log('If total objects queried is 3000, node-cloud may have maxxed out and the process will need to be reran.'); // eslint-disable-line
    response.forEach((surveyData) => {
      const survey = surveyData.toJSON();
      const postParams = {
        parseClass: 'SurveyData',
        parseClassID: survey.objectId,
        localObject: {
          surveyingOrganization: params.newValue,
        },
      };
      Parse.Cloud.run('updateObject', postParams).then(() => {
      }, () => {
          console.log(`Failed to update ObjectID: ${survey.objectId}`); // eslint-disable-line
      });
    });
  });
}

function checkCorrect(params) {
    console.log('Are these the correct versions? (y/n)'); // eslint-disable-line
  Object.keys(params).forEach((key) => {
        console.log(`  ${key}: ${params[key]}`); // eslint-disable-line
  });

  prompt.get(['correct'], (err, result) => {
      if (err) { console.log(err); } // eslint-disable-line
      console.log(`Correct: ${result.correct}`); // eslint-disable-line
    if (toUpper(result.correct) === 'Y') {
      queryAndUpdateSurveyData(params);
    } else {
      return 0;
    }
    return -1;
  });
}

function getParameters(keyword) {
  console.log(`${keyword} the current organization and new organization you wish to update with.`); // eslint-disable-line
  prompt.get(['currentValue', 'newValue'], (err, result) => {
    if (err) { console.log(err); } // eslint-disable-line
    checkCorrect(result);
    return 0;
  });
}


getParameters('Enter');
