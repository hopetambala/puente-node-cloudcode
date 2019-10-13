/**
* @author Hope Tambala <hopetambala@outlook.com>
* @package puente-node-cloudcode1.0 
* 2019-05-01
*/

var Parse = require("../utils/parse").getParse();
require("../migrations/classes/roles").migrate(Parse)
.then(() => {
  require("../migrations/data/first-admin").setFirstAdmin(Parse);
})