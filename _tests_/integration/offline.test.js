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

const findSurveyData = async (marker) => {
  const query = new Parse.Query('SurveyData');
  query.equalTo('testMarker', marker);
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

describe('offline uploader surveyor attribution', () => {
  // Records store who collected them at collection time; the account that
  // happens to press "sync" must not be stamped over the whole batch.
  const syncerMetadata = {
    surveyingUser: 'syncer@puente.org',
    surveyingOrganization: 'Puente',
    parseUser: 'syncer-parse-id',
    appVersion: '9.9.9-sync',
    phoneOS: 'android',
  };

  it('keeps the collection-time surveyingUser on resident forms', async () => {
    await cloudFunctions.uploadOfflineForms({
      residentForms: [
        {
          parseClass: 'SurveyData',
          parseUser: 'undefined',
          localObject: {
            objectId: 'PatientID-attribution-1',
            fname: 'Attributed',
            lname: 'Person',
            surveyingUser: 'collector@puente.org',
            surveyingOrganization: 'Puente',
            appVersion: '1.2.3',
            phoneOS: 'ios',
            testMarker: 'attribution-resident',
          },
        },
      ],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [],
      metadata: syncerMetadata,
    });

    const person = await findSurveyData('attribution-resident');
    expect(person).toBeDefined();
    expect(person.get('surveyingUser')).toEqual('collector@puente.org');
    expect(person.get('appVersion')).toEqual('1.2.3');
    expect(person.get('phoneOS')).toEqual('ios');
  });

  it('keeps the collection-time surveyingUser on supplementary forms', async () => {
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: {
        fname: 'Attribution',
        lname: 'Parent',
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
            heartRate: '65',
            surveyingUser: 'collector@puente.org',
            surveyingOrganization: 'Puente',
            testMarker: 'attribution-supplementary',
          },
        },
      ],
      metadata: syncerMetadata,
    });

    const vitals = await findVitals('attribution-supplementary');
    expect(vitals).toBeDefined();
    expect(vitals.get('surveyingUser')).toEqual('collector@puente.org');
  });

  it('falls back to sync-time metadata when the stored record lacks the field', async () => {
    // Older app versions stored records without surveyingUser, and store
    // appVersion as '' when unknown — metadata must still fill those gaps.
    await cloudFunctions.uploadOfflineForms({
      residentForms: [
        {
          parseClass: 'SurveyData',
          parseUser: 'undefined',
          localObject: {
            objectId: 'PatientID-attribution-2',
            fname: 'Legacy',
            lname: 'Record',
            appVersion: '',
            testMarker: 'attribution-fallback',
          },
        },
      ],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [],
      metadata: syncerMetadata,
    });

    const person = await findSurveyData('attribution-fallback');
    expect(person).toBeDefined();
    expect(person.get('surveyingUser')).toEqual('syncer@puente.org');
    expect(person.get('surveyingOrganization')).toEqual('Puente');
    expect(person.get('appVersion')).toEqual('9.9.9-sync');
  });
});
