const { Parse } = require('parse/node');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL,
} = require('./env.config');
const prompt = require('prompt');
const { toUpper } = require('lodash');

console.log( PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL)
if (PARSE_ENV === 'staging') {
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

prompt.start()

function getParameters(keyword) {
    console.log(`${keyword} the current organization and new organization you wish to update with.`)
    prompt.get(['currentValue','newValue'], (err, result) => {
        if (err) { return onErr(err); }
        checkCorrect(result);
    })
}

function checkCorrect(params) {
    console.log('Are these the correct versions? (y/n)');
    for(var key in params) {
        console.log(`  ${key} ${params[key]}`);
    }
    prompt.get(['correct'], (err, result) => {
      if (err) { return onErr(err); }
      console.log(`Correct: ${result.correct}`);
      if (toUpper(result.correct) === 'Y') {
        queryAndUpdateSurveyData(params);
      } else {
        getParameters('Re-enter');
      }
    });
  }

function queryAndUpdateSurveyData (params) {
    const basicQueryParams = {
        offset: 0,
        limit: 1000000,
        parseColumn: 'surveyingOrganization',
        parseParam: params.currentValue
    }

    Parse.Cloud.run('basicQuery', basicQueryParams).then((response) => {
        console.log(`Total objects queried: ${response.length}`);
        console.log(`If total objects queried is 3000, node-cloud may have maxxed out and the process will need to be reran.`)
        response.forEach((surveyData) => {
            const survey = surveyData.toJSON();
            const postParams = {
                parseClass: 'SurveyData',
                parseClassID: survey.objectId,
                localObject: {
                    surveyingOrganization: params.newValue
                }
            }
            Parse.Cloud.run('updateObject', postParams).then(() => {
            }, () => {
                console.log(`Failed to update ObjectID: ${survey.objectId}`);
            })
        });
    })
}

getParameters('Enter');