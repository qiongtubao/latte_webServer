/**

*/
var Cluster = require("cluster")
var Server = Cluster.isMaster? require("./master"): require("./slave");
var latte_lib = require("latte_lib");
(function() {
	var pro = ["bindServer"];
	var shareDatas = {

	};
	var self = this;
	this.bindServer = function(key, config) {
		if(pro.indexOf(key) != -1) {
			return latte_lib.debug.error("key error");
		}
		if(self[key]) {
			return latte_lib.debug.error("latte_web has server");
		}
		var server = self[key] = new Server(config);
		var shareData = shareData[key] = latte_lib.object.create({});
		server.setData = function(k, v) {
			shareData.set(k,v);
		}
		server.getData = function(k) {
			return shareData.get(k);
		}
	}
}).call(module.exports);