// A record that could not be saved arrives here as an explicit failure marker
// from services/offline/offline.js (or, historically, as a bare undefined).
// Calling .get() on it is what threw and wedged the entire batch, so pass it
// through untouched and let Offline.upload report it.
const { isUnsaved } = require('../../offline/failureMarker');

const afterSurveyHouseholdHook = async (records) => {
  if (!Array.isArray(records)) return [];
  const data = records.map(async (record) => {
    if (isUnsaved(record)) return record;
    const survey = record;
    const householdPointer = await survey.get('householdObjectIdOffline');
    if (!householdPointer) return survey;
    const householdQuery = new Parse.Query('Household');
    householdQuery.equalTo('objectIdOffline', householdPointer);
    const household = await householdQuery.first({ useMasterKey: true });
    if (!household) return survey;

    const residentQuery = new Parse.Query('SurveyData');
    const resident = await residentQuery.get(survey.id);
    resident.set('householdClient', household);
    resident.set('householdId', String(household.id));
    return resident.save();
  });

  try {
    return await Promise.all(data);
  } catch (error) {
			console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
    return [];
  }
};

const afterSupplementaryFormHook = async (records, parentClass = 'SurveyData') => {
  if (!Array.isArray(records)) return [];
  const data = records.map(async (record) => {
    if (isUnsaved(record)) return record;
    const supplementaryForm = record;
    const parentPointer = await supplementaryForm.get('parseParentClassObjectIdOffline');
    if (!parentPointer) return supplementaryForm;

    const parentQuery = new Parse.Query(parentClass);
    parentQuery.equalTo('objectIdOffline', parentPointer);
    const parent = await parentQuery.first({ useMasterKey: true });

    if (!parent) {
      // eslint-disable-next-line no-console
      console.error(`afterSupplementaryFormHook: ORPHANED ${supplementaryForm.className} ${supplementaryForm.id} — no ${parentClass} found with objectIdOffline=${parentPointer}; client pointer NOT set`);
      return supplementaryForm;
    }
    supplementaryForm.set('client', parent);
    return supplementaryForm.save().catch((error) => console.error('Error: afterSupplementaryFormHook', error)); //eslint-disable-line
  });

  try {
    return await Promise.all(data);
  } catch (error) {
			console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
    return [];
  }
};

module.exports = {
  afterSurveyHouseholdHook,
  afterSupplementaryFormHook,
};
