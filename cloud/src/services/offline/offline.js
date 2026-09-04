const { afterSurveyHouseholdHook, afterSupplementaryFormHook } = require('../post/hooks/afterSave');
const post = require('../post/post');
// Required directly rather than through services/index to avoid a require cycle.
const Organization = require('../organization/organization');
const { isUnsaved, failureMarker } = require('./failureMarker');

// Collection-time values (who surveyed, on which app/OS) must win over
// sync-time metadata — whoever presses "sync" is often not the surveyor.
// Metadata only fills fields the stored record left missing or empty.
const mergeMetadataAsFallback = (localObject, metadata) => {
  const merged = { ...localObject };
  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      merged[key] = value;
    }
  });
  return merged;
};

// A partially-failed batch stays queued on the device in full, so a retry
// re-sends records that already saved. The offline id (objectIdOffline) is
// the idempotency key: if a record with it already exists, return that
// record instead of creating a duplicate.
const findExistingOfflineRecord = (parseClass, objectIdOffline) => {
  const query = new Parse.Query(parseClass);
  query.equalTo('objectIdOffline', objectIdOffline);
  return query.first({ useMasterKey: true });
};

// A save Parse refuses resolves UNDEFINED rather than rejecting — post.js ends
// in `.catch((error) => console.error(...))`. That undefined then flows into an
// array the client reads as a saved category, so a household that never
// persisted is reported as a clean success and the device deletes its queue.
// Wrapping every record turns both an undefined and a thrown error into an
// explicit marker, so a partial failure can be reported instead of vanishing.
const attempt = async (category, record, run) => {
  // Captured BEFORE the body rewrites objectId into objectIdOffline, so the id
  // reported back is the one the device still has in its queue. Supplementary
  // forms have none until the client stamps a SupID- local id.
  const localObject = (record && record.localObject) || {};
  const offlineId = localObject.objectIdOffline || localObject.objectId || null;
  try {
    const saved = await run();
    if (saved === undefined || saved === null) {
      return failureMarker(category, offlineId, 'Parse refused the save');
    }
    return saved;
  } catch (error) {
    // Parse puts most of the diagnostic value in `code`; the message alone
    // reads as a generic failure in the logs and in the client's failures list.
    const detail = (error && error.message) ? error.message : String(error);
    return failureMarker(
      category, offlineId, (error && error.code) ? `[${error.code}] ${detail}` : detail,
    );
  }
};

const postObjectsArray = async (data, metadata, category) => {
  if (!data) return Promise.all([]);
  // Fetched once for the whole batch: an offline sync of N records would
  // otherwise pay N round-trips for a list that changes almost never.
  const organizations = await Organization.findAll().catch(() => null);
  const promises = data.map(async (obj) => attempt(category, obj, async () => {
    const record = obj;
    record.localObject = mergeMetadataAsFallback(record.localObject, metadata);
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

    if (localObject.objectIdOffline) {
      const existing = await findExistingOfflineRecord(
        record.parseClass, localObject.objectIdOffline,
      );
      if (existing) return existing;
    }

    return post.postObjectFactory('post', record, organizations);
  }));

  // `attempt` never rejects, so every entry is a saved record or a marker. The
  // try/catch that used to be here was dead code: the Promise.all was returned
  // un-awaited, so a rejection escaped the catch entirely.
  return Promise.all(promises);
};

const postObjectsWithRelationshipsArray = async (data, metadata, category) => {
  const organizations = await Organization.findAll().catch(() => null);
  if (!data) return Promise.all([]);
  const promises = data.map(async (obj) => attempt(category, obj, async () => {
    const record = obj;
    record.localObject = mergeMetadataAsFallback(record.localObject, metadata);
    const { localObject } = record;
    // Guarded. A record with no parent id threw a TypeError here, while both
    // sibling functions guarded every equivalent access.
    const parentId = record.parseParentClassID ? String(record.parseParentClassID) : '';
    if (parentId.includes('PatientID-')) {
      localObject.parseParentClassObjectIdOffline = parentId;
    }
    if (parentId.includes('AssetID-')) {
      localObject.parseParentClassObjectIdOffline = parentId;
    }

    // Supplementary forms stamped with a SupID-… local id get the same
    // treatment as PatientID-/AssetID- records: the local id becomes
    // objectIdOffline (Parse rejects unknown objectIds) and dedupes retries.
    if (localObject.objectId && localObject.objectId.includes('SupID-')) {
      localObject.objectIdOffline = localObject.objectId;
      delete localObject.objectId;
    }

    if (localObject.objectIdOffline) {
      const existing = await findExistingOfflineRecord(
        record.parseClass, localObject.objectIdOffline,
      );
      if (existing) return existing;
    }

    return post.postObjectFactory('post-relationship', record, organizations);
  }));

  // This catch WAS live (the Promise.all was awaited) and returned the Error
  // OBJECT where every caller expects an array — the afterSave hook then called
  // .map on it and threw again.
  return Promise.all(promises);
};

const postHouseholdArray = async (data, metadata, category) => {
  const organizations = await Organization.findAll().catch(() => null);
  if (!data) return [];
  const promises = data.map(async (obj) => attempt(category, obj, async () => {
    const record = obj;

    record.localObject = mergeMetadataAsFallback(record.localObject, metadata);
    const { localObject } = record;
    if (localObject.objectId && localObject.objectId.includes('Household-')) {
      localObject.objectIdOffline = localObject.objectId;
      delete localObject.objectId;
    }

    if (localObject.objectIdOffline) {
      const existing = await findExistingOfflineRecord(
        record.parseClass, localObject.objectIdOffline,
      );
      if (existing) return existing;
    }

    return post.postObjectFactory('post', record, organizations);
  }));

  return Promise.all(promises);
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

  if (type === 'households') return postHouseholdArray(households, metadata, 'households');
  if (type === 'assetForms') return postObjectsArray(assetForms, metadata, 'assetForms');
  if (type === 'residentForms') return postObjectsArray(residentForms, metadata, 'residentForms').then((results) => afterSurveyHouseholdHook(results));
  if (type === 'residentSupplementaryForms') return postObjectsWithRelationshipsArray(residentSupplementaryForms, metadata, 'residentSupplementaryForms').then((results) => afterSupplementaryFormHook(results, 'SurveyData'));
  if (type === 'assetSupplementaryForms') return postObjectsWithRelationshipsArray(assetSupplementaryForms, metadata, 'assetSupplementaryForms').then((results) => afterSupplementaryFormHook(results, 'Assets'));
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
      const categories = {
        residentForms,
        assetForms,
        households,
        residentSupplementaryForms,
        assetSupplementaryForms,
      };

      const saved = {};
      const failures = [];
      Object.entries(categories).forEach(([key, list]) => {
        const rows = Array.isArray(list) ? list : [];
        saved[key] = rows.filter((row) => !isUnsaved(row));
        rows.filter(isUnsaved).forEach((row) => failures.push({
          category: key,
          offlineId: (row && row.offlineId) || null,
          message: (row && row.message) || 'Parse refused the save',
        }));
      });

      // Everything saved: the shape is byte-identical to what it has always
      // been, so builds already in the field are unaffected.
      if (failures.length === 0) return saved;

      // Something did not. The five arrays are nested under `saved` ON PURPOSE:
      // a build in the field checks for them at the TOP level
      // (isCompleteUploadResult in puente-reactnative-collect
      // modules/offline/post/index.js), so it reads this as incomplete, reports
      // Error and keeps its whole queue — exactly its current safe behaviour.
      // Collect has no OTA, so old builds stay in use for weeks; this change
      // must be safe for them without an app release. A newer build reads
      // `saved` and drops only the queue entries that actually persisted.
      return { status: 'PartialFailure', saved, failures };
    } catch (err) {
      console.error('Error: Offline',err); //eslint-disable-line
      // Returning the bare Error serialises across Parse as {} — an old build
      // reads that as "not five arrays" and safely keeps its queue, but a newer
      // build gets no failures list at all. Answer in the documented shape.
      //
      // A malformed category deliberately lands HERE rather than being coerced
      // to an empty array: coercing would report "nothing to save, all good"
      // and the device would delete records it never uploaded.
      return {
        status: 'Error',
        saved: {
          residentForms: [],
          assetForms: [],
          households: [],
          residentSupplementaryForms: [],
          assetSupplementaryForms: [],
        },
        failures: [{
          category: null,
          offlineId: null,
          message: (err && err.message) ? err.message : String(err),
        }],
      };
    }
  },
};

module.exports = Offline;
