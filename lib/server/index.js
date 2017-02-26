/**

*/
var Cluster = require("cluster")
var Server = Cluster.isMaster? require("./master"): require("./slave");
module.exports = Server;