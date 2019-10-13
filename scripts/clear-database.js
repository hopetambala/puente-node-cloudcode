/**
* @author Hope Tambala <hopetambala@outlook.com>
* @package puente-node-cloudcode1.0 
* 2019-05-01
*/

var Parse = require("../utils/parse").getParse();
var _ = require("lodash");

var CleanUp = require("../utils/clean-up-database");


const builtInFields = [
  "objectId",
  "createdAt",
  "updatedAt",
  "ACL"
];


var ClearDatabase = {
  clearAll () {
    return this.clearAllExcept([]);
  },
  /**
   * removes all Parse tables data
   * @param  {Array<string>} exclude The tables to exclude from deleting
   * @return {Promise}
   */
  clearAllExcept(exclude)  {
    return Parse.Schema.all({useMasterKey : true})
    .then((schemas) => {
      return Promise.all(
        _.chain(schemas)
        .filter(item => (!_.includes(exclude, item.className)))
        .map((item) =>
          CleanUp.purgeTable(item.className, true)
          .then(() => new Parse.Schema(item.className).delete().catch(() => console.log(item)))
          // _.map(())
        )
        .value()
      )
    })
  }
}
//
// Parse.Schema.all({useMasterKey : true})
// .then((schema) =>
//   Promise.all(
//     _.map(schema, (item) =>
//       CleanUp.purgeTable(item.className, true)
//         .then(() => new Parse.Schema(item.className).delete().catch(() => console.log(item)))
//     )
//   )
// )



ClearDatabase.clearAllExcept([
//   "_Role",
// "_User",
// "_Session",
// "Person",
// "Profile",
// "Community",
// "Patient",
// "CaseManager"
])
.then((resp) => {
  console.log(resp);
})
.catch((e) => {
  console.log("ERROR", e);
});