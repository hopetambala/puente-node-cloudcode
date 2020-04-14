/**
* @author Hope Tambala<hope@puente-dr.com>
*/


import express from 'express';
var ParseServer = require('parse-server').ParseServer;


require('dotenv').config()


var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}


let SERVER_URL = process.env.SERVER_URL || 'http://localhost:4040/parse';
let MASTER_KEY = process.env.MASTER_KEY || '';
let APP_ID = process.env.APP_ID || 'myAppId';
let DATABASE_URI = databaseUri || 'mongodb://localhost:27017/dev';
let CLOUD = process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js';
let APP_NAME = process.env.APP_NAME || "Puente-Node-CloudCode 1.0";
var api = new ParseServer({
  databaseURI: DATABASE_URI,
  appName: 'Puente Local',
  publicServerURL: SERVER_URL,
  cloud: CLOUD,
  appId: APP_ID,
  masterKey: MASTER_KEY, //Add your master key here. Keep it secret!
  serverURL: SERVER_URL,  // Don't forget to change to https if needed
  // liveQuery: {
  //   //classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  // }
});



var app = express();

// make the Parse Server available at /parse
app.use('/parse', api);


let port;
let urlPath = SERVER_URL.split(":");
urlPath = urlPath[urlPath.length - 1];
port = parseInt(urlPath.split("/")[0]);

app.listen(port, ()=>{
  console.log(`Listening on ${port}. For the dashboard go to: http://localhost:${port}/dashboard`)
});