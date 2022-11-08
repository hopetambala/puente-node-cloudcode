const afterSurveyHouseholdHook = async (records) => {
  const data = records.map(async (record) => {
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
    return Promise.all(data);
  } catch (error) {
			console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
    return [];
  }
};

const afterSupplementaryFormHook = async (records, parentClass = 'SurveyData') => {
  const data = records.map(async (record) => {
    const supplementaryForm = record;
    const parentPointer = await supplementaryForm.get('parseParentClassObjectIdOffline');
    if (!parentPointer) return supplementaryForm;

    const parentQuery = new Parse.Query(parentClass);
    parentQuery.equalTo('objectIdOffline', parentPointer);
    const parent = await parentQuery.first({ useMasterKey: true });

    if (!parent) return supplementaryForm;
    supplementaryForm.set('client', parent);
    return supplementaryForm.save().catch((error) => console.error('Error: afterSupplementaryFormHook', error)); //eslint-disable-line
  });

  try {
    return Promise.all(data);
  } catch (error) {
			console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
    return [];
  }
};

module.exports = {
  afterSurveyHouseholdHook,
  afterSupplementaryFormHook,
};
