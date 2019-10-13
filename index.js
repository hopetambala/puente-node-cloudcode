/**
* @author Hope Tambala<hope@puente-dr.com>
*/


var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');

var path = require('path');

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
let APP_NAME = process.env.APP_NAME || "Healthypoints 2.0";
var api = new ParseServer({
  databaseURI: DATABASE_URI,
  appName: 'Puente Local',
  publicServerURL: SERVER_URL,
  cloud: CLOUD,
  appId: APP_ID,
  masterKey: MASTER_KEY, //Add your master key here. Keep it secret!
  serverURL: SERVER_URL,  // Don't forget to change to https if needed
  liveQuery: {
    //classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  // verifyUserEmails: true,
  emailAdapter: {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
     fromAddress: 'hope@puente-dr.com',
      domain: 'mg.healthypointscommunitymobile.com',
      apiKey: 'key-dcf095002ea70a29c26be664800e0cc6',
    }
  }
});


var options = { allowInsecureHTTP: true };

var dashboard = new ParseDashboard({
  "apps": [
  {
    "serverURL": SERVER_URL,
    "appId": APP_ID,
    "masterKey": MASTER_KEY,
    "appName": APP_NAME
  }
]
}, options);

var app = express();

// make the Parse Server available at /parse
app.use('/parse', api);

// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

var httpServer = require('http').createServer(app);
let port;
let urlPath = SERVER_URL.split(":");
urlPath = urlPath[urlPath.length - 1];
port = parseInt(urlPath.split("/")[0]);

app.listen(port, ()=>{
  console.log(`Listening on ${port}. For the dashboard go to: http://localhost:${port}/dashboard`)
});