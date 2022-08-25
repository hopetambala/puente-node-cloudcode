const data = require('../data');

/** ******************************************
  GEO QUERY
  Input Paramaters:
    parseColumn - Column to search for values
    parseParam - value to be searched in columns
    limit - max number of records to return
    lat/long - latitude/longitude, query results will always be within 5 miles of these values
  ******************************************* */
Parse.Cloud.define('migration-up', (request) => {
  const migrationName = request.params.migrationName
  const migration = data[migrationName];
  return migration.up();
});

Parse.Cloud.define('migration-down', (request) => {
  const migrationName = request.params.migrationName
  const migration = data[migrationName];
  return migration.down();
});
