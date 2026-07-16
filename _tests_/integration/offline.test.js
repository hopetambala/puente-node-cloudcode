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

describe('offline upload response contract', () => {
  // The mobile app treats any payload missing one of these five arrays as a
  // failed sync and keeps its local queue (puente-reactnative-collect
  // modules/offline/post). Changing this shape strands field devices in
  // permanent retry — this test is the server half of that contract.
  it('success payload carries all five categories as arrays', async () => {
    const result = await cloudFunctions.uploadOfflineForms({
      residentForms: [],
      households: [],
      assetForms: [],
      assetSupplementaryForms: [],
      residentSupplementaryForms: [],
      metadata,
    });

    ['residentForms', 'residentSupplementaryForms', 'households',
      'assetForms', 'assetSupplementaryForms'].forEach((key) => {
      expect(Array.isArray(result[key])).toBe(true);
    });
  });
});

describe('offline upload idempotency', () => {
  // A batch that partially fails leaves the whole queue on-device; the retry
  // re-sends records that already saved. Re-syncing the same offline id must
  // not create a duplicate.
  const emptyBatch = () => ({
    residentForms: [],
    households: [],
    assetForms: [],
    assetSupplementaryForms: [],
    residentSupplementaryForms: [],
    metadata,
  });

  const countByMarker = async (parseClass, marker) => {
    const query = new Parse.Query(parseClass);
    query.equalTo('testMarker', marker);
    return query.count();
  };

  it('re-syncing a resident form with the same offline id does not duplicate it', async () => {
    const batch = () => ({
      ...emptyBatch(),
      residentForms: [{
        parseClass: 'SurveyData',
        parseUser: 'undefined',
        localObject: {
          objectId: 'PatientID-idem-1',
          fname: 'Idem',
          lname: 'Potent',
          surveyingOrganization: 'Puente',
          testMarker: 'idem-resident',
        },
      }],
    });

    await cloudFunctions.uploadOfflineForms(batch());
    await cloudFunctions.uploadOfflineForms(batch());

    expect(await countByMarker('SurveyData', 'idem-resident')).toEqual(1);
  });

  it('re-syncing a household with the same offline id does not duplicate it', async () => {
    const batch = () => ({
      ...emptyBatch(),
      households: [{
        parseClass: 'Household',
        parseUser: 'undefined',
        localObject: {
          objectId: 'Household-idem-1',
          latitude: 18.5,
          testMarker: 'idem-household',
        },
      }],
    });

    await cloudFunctions.uploadOfflineForms(batch());
    await cloudFunctions.uploadOfflineForms(batch());

    expect(await countByMarker('Household', 'idem-household')).toEqual(1);
  });

  it('accepts SupID- local ids on supplementary forms: strips to objectIdOffline, links, and dedupes', async () => {
    // Supplementary offline records carry no local id today; the mobile app
    // will start stamping SupID-… ids so retries can dedupe. The server must
    // handle them the same way it handles PatientID-/AssetID- ids.
    const parent = await cloudFunctions.postObjectsToClass({
      parseClass: 'SurveyData',
      parseUser: 'undefined',
      localObject: {
        fname: 'Idem',
        lname: 'Parent',
        surveyingOrganization: 'Puente',
      },
    });

    const batch = () => ({
      ...emptyBatch(),
      residentSupplementaryForms: [{
        parseClass: 'Vitals',
        parseParentClass: 'SurveyData',
        parseParentClassID: parent.id,
        parseUser: 'undefined',
        localObject: {
          objectId: 'SupID-idem-1',
          heartRate: '75',
          surveyingOrganization: 'Puente',
          testMarker: 'idem-sup',
        },
      }],
    });

    await cloudFunctions.uploadOfflineForms(batch());
    await cloudFunctions.uploadOfflineForms(batch());

    expect(await countByMarker('Vitals', 'idem-sup')).toEqual(1);
    const vitals = await findVitals('idem-sup');
    expect(vitals.get('objectIdOffline')).toEqual('SupID-idem-1');
    expect(vitals.get('client')).toBeDefined();
    expect(vitals.get('client').id).toEqual(parent.id);
  });
});
