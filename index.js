/**
* @author Hope Tambala<hope@puente-dr.com>
*/


import express from 'express';

const { ParseServer } = require('parse-server');


require('dotenv').config();


const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}


const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4040/parse';
const MASTER_KEY = process.env.MASTER_KEY || '';
const APP_ID = process.env.APP_ID || 'myAppId';
const DATABASE_URI = databaseUri || 'mongodb://localhost:27017/dev';
const CLOUD = process.env.CLOUD_CODE_MAIN || `${__dirname}/cloud/main.js`;
// const APP_NAME = process.env.APP_NAME || 'Puente-Node-CloudCode 1.0';
const api = new ParseServer({
  databaseURI: DATABASE_URI,
  appName: 'Puente Local',
  publicServerURL: SERVER_URL,
  cloud: CLOUD,
  appId: APP_ID,
  masterKey: MASTER_KEY, // Add your master key here. Keep it secret!
  serverURL: SERVER_URL, // Don't forget to change to https if needed
  // liveQuery: {
  //   //classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  // }
});


const app = express();

// make the Parse Server available at /parse
app.use('/parse', api);


let urlPath = SERVER_URL.split(':');
urlPath = urlPath[urlPath.length - 1];
const port = parseInt(urlPath.split('/')[0], 10);

app.listen(port, () => {
  console.log(`Listening on ${port}. For the dashboard go to: http://localhost:${port}/dashboard`);
});
