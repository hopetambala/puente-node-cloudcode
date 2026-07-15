const { Parse } = require('parse/node');

const { cloudFunctions } = require('../run-cloud');

const metadata = {
  surveyingUser: 'Offline Tester',
  surveyingOrganization: 'Puente',
  appVersion: '1.0.0-test',
  phoneOS: 'ios',
};

const findVitals = async (marker) => {
  const query = new Parse.Query('Vitals');
  query.equalTo('testMarker', marker);
  query.include('client');
  return query.first();
};

describe('offline uploader client linking', () => {
  it('links an offline supplementary form to an already-synced client', async () => {
    // The client (person) exists online already — the everyday follow-up
    // visit case: vitals are collected offline against a synced record.
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: {
        fname: 'Synced',
        lname: 'Client',
        surveyingOrganization: 'Puente',
      },
    });

    await cloudFunctions.uploadOfflineForms({
      residentForms: [],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [
        {
          parseClass: 'Vitals',
          parseParentClass: 'SurveyData',
          parseParentClassID: parent.id,
          parseUser: 'undefined',
          localObject: {
            heartRate: '70',
            bloodPressure: '100/100',
            surveyingOrganization: 'Puente',
            testMarker: 'offline-synced-parent',
          },
        },
      ],
      metadata,
    });

    const vitals = await findVitals('offline-synced-parent');
    expect(vitals).toBeDefined();
    expect(vitals.get('heartRate')).toEqual('70');
    const client = vitals.get('client');
    expect(client).toBeDefined();
    expect(client.id).toEqual(parent.id);
  });

  it('links an offline supplementary form to a parent created in the same offline batch', async () => {
    // Existing behavior guard: parent registered offline (PatientID-… local
    // id) in the same sync; afterSupplementaryFormHook resolves the link.
    await cloudFunctions.uploadOfflineForms({
      residentForms: [
        {
          parseClass: 'SurveyData',
          parseUser: 'undefined',
          localObject: {
            objectId: 'PatientID-offline-123',
            fname: 'Offline',
            lname: 'Client',
            surveyingOrganization: 'Puente',
          },
        },
      ],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [
        {
          parseClass: 'Vitals',
          parseParentClass: 'SurveyData',
          parseParentClassID: 'PatientID-offline-123',
          parseUser: 'undefined',
          localObject: {
            heartRate: '80',
            surveyingOrganization: 'Puente',
            testMarker: 'offline-offline-parent',
          },
        },
      ],
      metadata,
    });

    const vitals = await findVitals('offline-offline-parent');
    expect(vitals).toBeDefined();
    const client = vitals.get('client');
    expect(client).toBeDefined();
    expect(client.get('objectIdOffline')).toEqual('PatientID-offline-123');
  });
});
