const { afterSurveyHouseholdHook, afterSupplementaryFormHook } = require('../post/hooks/afterSave');
const post = require('../post/post');

const postObjectsArray = (data, metadata) => {
  if (!data) return Promise.all([]);
  const promises = data.map(async (obj) => {
    const record = obj;
    record.localObject = {
      ...record.localObject,
      ...metadata,
    };
    const { localObject } = record;
    if (localObject.objectId && localObject.objectId.includes('PatientID-')) {
      localObject.objectIdOffline = localObject.objectId;
      delete localObject.objectId;
    }

    if (localObject.householdId && localObject.householdId.includes('Household-')) {
      localObject.householdObjectIdOffline = localObject.householdId;
      delete localObject.householdId;
    }

    if (localObject.objectId && localObject.objectId.includes('AssetID-')) {
      localObject.objectIdOffline = localObject.objectId;
      delete localObject.objectId;
    }

    return post.postObjectFactory('post', record);
  });

  try {
    return Promise.all(promises);
  } catch (error) {
    console.error('Error: postObjectsArray' ,error); //eslint-disable-line
    return error;
  }
};

const postObjectsWithRelationshipsArray = async (data, metadata) => {
  if (!data) return Promise.all([]);
  const promises = data.map(async (obj) => {
    const record = obj;
    record.localObject = {
      ...record.localObject,
      ...metadata,
    };
    const { localObject } = record;
    if (record.parseParentClassID.includes('PatientID-')) {
      localObject.parseParentClassObjectIdOffline = record.parseParentClassID;
    }
    if (record.parseParentClassID.includes('AssetID-')) {
      localObject.parseParentClassObjectIdOffline = record.parseParentClassID;
    }

    return post.postObjectFactory('post-relationship', record);
  });

  try {
    const posts = await Promise.all(promises);
    return posts;
  } catch (error) {
    console.error('Error: postObjectsWithRelationshipsArray',error); //eslint-disable-line
    return error;
  }
};

const postHouseholdArray = (data, metadata) => {
  if (!data) return [];
  const promises = data.map(async (obj) => {
    const record = obj;

    record.localObject = {
      ...record.localObject,
      ...metadata,
    };
    const { localObject } = record;
    if (localObject.objectId && localObject.objectId.includes('Household-')) {
      localObject.objectIdOffline = localObject.objectId;
      delete localObject.objectId;
    }
    return post.postObjectFactory('post', record);
  });

  try {
    return Promise.all(promises);
  } catch (error) {
    console.error('Error: postHouseholdArray',error); //eslint-disable-line
    return error;
  }
};

const OfflineFactory = (records, type) => {
  const {
    residentForms,
    residentSupplementaryForms,
    households,
    assetForms,
    assetSupplementaryForms,
    metadata,
  } = records;

  if (type === 'households') return postHouseholdArray(households, metadata);
  if (type === 'assetForms') return postObjectsArray(assetForms, metadata);
  if (type === 'residentForms') return postObjectsArray(residentForms, metadata).then((results) => afterSurveyHouseholdHook(results));
  if (type === 'residentSupplementaryForms') return postObjectsWithRelationshipsArray(residentSupplementaryForms, metadata).then((results) => afterSupplementaryFormHook(results, 'SurveyData'));
  if (type === 'assetSupplementaryForms') return postObjectsWithRelationshipsArray(assetSupplementaryForms, metadata).then((results) => afterSupplementaryFormHook(results, 'Assets'));
  return [];
};

const Offline = {
  upload: async function upload(records) {
    try {
      const households = await OfflineFactory(records, 'households');
      const residentForms = await OfflineFactory(records, 'residentForms');
      const assetForms = await OfflineFactory(records, 'assetForms');
      const residentSupplementaryForms = await OfflineFactory(records, 'residentSupplementaryForms');
      const assetSupplementaryForms = await OfflineFactory(records, 'assetSupplementaryForms');
      return {
        residentForms,
        assetForms,
        households,
        residentSupplementaryForms,
        assetSupplementaryForms,
      };
    } catch (err) {
      console.error('Error: Offline',err); //eslint-disable-line
      return err;
    }
  },
};

module.exports = Offline;
