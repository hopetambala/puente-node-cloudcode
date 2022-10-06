const services = require('../services');

Parse.Cloud.define('uploadOfflineForms', (request) => new Promise((resolve, reject) => {
  const { params: offlineData } = request;
  try {
    const uploadedForms = services.offline.upload(offlineData);
    return resolve(uploadedForms);
  } catch (err) {
    return reject(new Error(`Cloud code error: ${err}`));
  }
}));

Parse.Cloud.afterSave('FormResults', async (request) => {
  const customForm = request.object;
  const hasClient = customForm.get('client');
  if (hasClient) {
    return {};
  }

  const formResultsPointer = await customForm.get('parseParentClassObjectIdOffline');

  const residentQuery = new Parse.Query('SurveyData');
  residentQuery.equalTo('objectIdOffline', formResultsPointer);
  return residentQuery.first({ useMasterKey: true }).then(async (resident) => {
    const supplementaryQuery = new Parse.Query('FormResults');
    try {
      const form = await supplementaryQuery.get(request.object.id);
      form.set('client', resident);
      return form.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return { };
    }
  });
});

Parse.Cloud.afterSave('FormAssetResults', async (request) => {
  const supplementaryAssetForm = request.object;
  const hasClient = supplementaryAssetForm.get('client');
  if (hasClient) {
    return {};
  }

  const formAssetResultsPointer = await supplementaryAssetForm.get('parseParentClassObjectIdOffline');

  const assetQuery = new Parse.Query('Assets');
  assetQuery.equalTo('objectIdOffline', formAssetResultsPointer);
  return assetQuery.first({ useMasterKey: true }).then(async (asset) => {
    const supplementaryAssetQuery = new Parse.Query('FormAssetResults');
    try {
      const supplementaryAsset = await supplementaryAssetQuery.get(request.object.id);
      supplementaryAsset.set('client', asset);
      return supplementaryAsset.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return { };
    }
  });
});

Parse.Cloud.afterSave('HistoryEnvironmentalHealth', async (request) => {
  const environmentalForm = request.object;
  const hasClient = environmentalForm.get('client');
  if (hasClient) {
    return {};
  }

  const formResultsPointer = await environmentalForm.get('parseParentClassObjectIdOffline');

  const residentQuery = new Parse.Query('SurveyData');
  residentQuery.equalTo('objectIdOffline', formResultsPointer);
  return residentQuery.first({ useMasterKey: true }).then(async (resident) => {
    const supplementaryQuery = new Parse.Query('HistoryEnvironmentalHealth');
    try {
      const form = await supplementaryQuery.get(request.object.id);
      form.set('client', resident);
      return form.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return {};
    }
  });
});

Parse.Cloud.afterSave('Vitals', async (request) => {
  const vitalForm = request.object;
  const hasClient = vitalForm.get('client');
  if (hasClient) {
    return {};
  }

  const formResultsPointer = await vitalForm.get('parseParentClassObjectIdOffline');

  const residentQuery = new Parse.Query('SurveyData');
  residentQuery.equalTo('objectIdOffline', formResultsPointer);
  return residentQuery.first({ useMasterKey: true }).then(async (resident) => {
    const supplementaryQuery = new Parse.Query('Vitals');
    try {
      const form = await supplementaryQuery.get(request.object.id);
      form.set('client', resident);
      return form.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return {};
    }
  });
});

Parse.Cloud.afterSave('HistoryMedical', async (request) => {
  const historyMedicalform = request.object;
  const hasClient = historyMedicalform.get('client');
  if (hasClient) {
    return {};
  }

  const historyMedicalformResultsPointer = await historyMedicalform.get('parseParentClassObjectIdOffline');

  const residentQuery = new Parse.Query('SurveyData');
  residentQuery.equalTo('objectIdOffline', historyMedicalformResultsPointer);
  return residentQuery.first({ useMasterKey: true }).then(async (resident) => {
    const supplementaryQuery = new Parse.Query('HistoryMedical');
    try {
      const supForm = await supplementaryQuery.get(request.object.id);
      supForm.set('client', resident);
      return supForm.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return {};
    }
  });
});

Parse.Cloud.afterSave('Allergies', async (request) => {
  const allergiesForm = request.object;
  const hasClient = allergiesForm.get('client');
  if (hasClient) {
    return {};
  }

  const formResultsPointer = await allergiesForm.get('parseParentClassObjectIdOffline');

  const residentQuery = new Parse.Query('SurveyData');
  residentQuery.equalTo('objectIdOffline', formResultsPointer);
  return residentQuery.first({ useMasterKey: true }).then(async (resident) => {
    const supplementaryQuery = new Parse.Query('Allergies');
    try {
      const form = await supplementaryQuery.get(request.object.id);
      form.set('client', resident);
      return form.save();
    } catch (error) {
      console.error(`Got an error ${error.code} : ${error.message}`); //eslint-disable-line
      return {};
    }
  });
});
