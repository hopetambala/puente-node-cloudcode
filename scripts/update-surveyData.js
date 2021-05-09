const { Parse } = require('parse/node');
const {
  PARSE_ENV, PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL,
} = require('./env.config');

if (PARSE_ENV === 'staging') {
  // PASTE HERE YOUR Back4App APPLICATION ID AND YOUR JavaScript KEY
  Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
} else {
  Parse.initialize(PARSE_APP_ID);
  Parse.serverURL = PARSE_SERVER_URL;
}

Parse.Cloud.run('genericQuery').then((response) => {
  console.log(`Total objects queried: ${response.length}`); // eslint-disable-line
  response.forEach((surveyData) => {
    const survey = surveyData.toJSON();
    const postParams = {
      parseClass: 'SurveyData',
      parseClassID: survey.objectId,
      localObject: {
        searchIndex: `${survey.fname || ''} ${survey.lname || ''}`,
      },
    };
    Parse.Cloud.run('updateObject', postParams).then(() => {
    }, () => {
      console.log(`Failed to update ObjectID: ${survey.objectId}`); // eslint-disable-line
    });
  });
});
