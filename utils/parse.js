/**
* @author Hope Tambala <hopetambala@outlook.com>
* @package puente-node-cloudcode1.0 
* 2019-05-01
*/

var Parse = require("parse/node");

require("dotenv").config();

//console.log((process.env.STAGING) ? "STAGING" : "DEVELOPMENT");
module.exports = {
  getParse: function() {
    let env_prefix = "";
    if (process.env.STAGING) {
      env_prefix = "STAGING_";
    } else if (process.env.PRODUCTION) {
      env_prefix = "PRODUCTION_";
    }

    const app_id = process.env[`${env_prefix}APP_ID`];
    const master_key = process.env[`${env_prefix}MASTER_KEY`];
    const js_key = process.env[`${env_prefix}JS_KEY`];
    const server_url = process.env[`${env_prefix}SERVER_URL`];

    console.log(env_prefix);

    Parse.initialize(app_id, js_key, master_key);

    Parse.serverURL = server_url;
    return Parse;
  }
};