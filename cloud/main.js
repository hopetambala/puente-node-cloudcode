Parse.Cloud.define('hello', () => new Promise((resolve) => {
  resolve('Hello world!');
}));

/** ********************************************
 * Create, Read, Update, and Delete Objects
 ******************************************** */
require('./src/definer/crud.definer');

/** ********************************************
 * Sign-in, Sign-out, Forget Password
 ******************************************** */

require('./src/definer/auth.definer');

/** ********************************************
 * Admin Verification
 ******************************************** */
require('./src/definer/verification.definer');

/** ********************************************
 * Roles Creator and Manager
 ******************************************** */
require('./src/definer/roles.definer');

/** ********************************************
 * Offline Uploader and Manager
 ******************************************** */
require('./src/definer/offline.definer');
