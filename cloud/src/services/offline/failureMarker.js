// One record in an offline batch can fail to save while its neighbours are
// fine. post.js swallows that failure into `undefined`, which then travels
// through the pipeline looking like a saved record — the afterSave hooks call
// `.get()` on it and throw, or, for the two categories with no hook, it stays
// in the array and the device is told the sync succeeded.
//
// This marker replaces that undefined with something explicit, so a partial
// failure can be reported to the client instead of disappearing.
//
// Lives in its own module because both services/offline/offline.js (which
// creates markers) and services/post/hooks/afterSave.js (which must pass them
// through untouched) need it, and offline.js already requires afterSave.js —
// putting it in either would be a require cycle.
const OFFLINE_FAILURE_KEY = 'offlineSaveFailed';

/** True for a failure marker, and for a bare undefined/null from an older path. */
const isUnsaved = (record) => !record || record[OFFLINE_FAILURE_KEY] === true;

const failureMarker = (category, offlineId, message) => ({
  [OFFLINE_FAILURE_KEY]: true,
  category,
  offlineId: offlineId || null,
  message: message || 'Parse refused the save',
});

module.exports = { OFFLINE_FAILURE_KEY, isUnsaved, failureMarker };
