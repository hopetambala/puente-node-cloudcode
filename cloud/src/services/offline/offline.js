const { afterSurveyHouseholdHook } = require('../post/hooks/afterSave');
const post = require('../post/post');

const postObjectsArray = (data, metadata) => {
  if (!data) return [];
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
    return error;
  }
};

const postObjectsWithRelationshipsArray = async (data, metadata) => {
  if (!data) return [];
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
    return error;
  }
};

const OfflineFactory = (records, type) => {
  const {
    residentForms,
    residentSupplementaryForms,
    households,
    // householdRelations,
    assetForms,
    assetSupplementaryForms,
    metadata,
  } = records;

  if (type === 'households') return postHouseholdArray(households, metadata);
  if (type === 'assetForms') return postObjectsArray(assetForms, metadata);
  if (type === 'residentForms') return postObjectsArray(residentForms, metadata).then((results) => afterSurveyHouseholdHook(results));
  if (type === 'residentSupplementaryForms') return postObjectsWithRelationshipsArray(residentSupplementaryForms, metadata);
  // if (type === 'householdRelations') return postObjectsWithRelationshipsArray(householdRelations)
  if (type === 'assetSupplementaryForms') return postObjectsWithRelationshipsArray(assetSupplementaryForms, metadata);
  return [];
};

const Offline = {
  upload: async function upload(records) {
    try {
      const households = await Promise.resolve(OfflineFactory(records, 'households'));
      const residentForms = await Promise.resolve(OfflineFactory(records, 'residentForms'));
      const assetForms = await Promise.resolve(OfflineFactory(records, 'assetForms'));
      const residentSupplementaryForms = await Promise.resolve(OfflineFactory(records, 'residentSupplementaryForms'));
      const assetSupplementaryForms = await Promise.resolve(OfflineFactory(records, 'assetSupplementaryForms'));
      return {
        residentForms,
        assetForms,
        households,
        residentSupplementaryForms,
        assetSupplementaryForms,
      };
    } catch (err) {
      console.log(err); //eslint-disable-line
      return err;
    }
  },
};

module.exports = Offline;
