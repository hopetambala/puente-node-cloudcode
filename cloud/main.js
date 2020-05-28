/* global Parse */
/* eslint no-undef: "error" */

const classes = require('./src/classes');
const services = require('./src/services');

Parse.Cloud.define('hello', (request, response) => new Promise((resolve) => {
  response.success(resolve('Hello world!'));
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


