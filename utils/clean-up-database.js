/**
* @author Hope Tambala <hopetambala@outlook.com>
* @package puente-node-cloudcode1.0 
* 2019-05-01
*/

var Parse = require('./parse').getParse();
var _ = require('lodash');

/**
 * Testing utility for purging the test database for test consistency
 */
function CleanUp() {}
CleanUp.prototype.purgeTable = async function(tableName, useMasterKey) {
  var tableQuery;
  tableQuery = new Parse.Query(tableName);
  if (tableName === 'Users') tableQuery = new Parse.Query(Parse.User);
  else if (tableName === 'Sessions' || tableName === '_Session')
    tableQuery = new Parse.Query(Parse.Session);
  else if (tableName === '_Role') tableQuery = new Parse.Query(Parse.Role);

  try {
    const count = await tableQuery.count({ useMasterKey: true });
    let left = 0;
    while (count > left) {
      const items = await tableQuery.limit(1000).find({ useMasterKey: true });
      try {
        await Promise.all(
          _.map(items, item => item.destroy({ useMasterKey: true }))
        );
      } catch (err) {}
      left += items.length;
    }
  } catch (err) {
    console.log(err);
  }
  return Promise.resolve();
};

CleanUp.prototype.purgeTables = function(tables, useMasterKey) {
  return Promise.all(
    _.map(tables, table => this.purgeTable(table, useMasterKey))
  );
};

module.exports = new CleanUp();