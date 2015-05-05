(function(define) { 'use strict';
	define("latte_web/master", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, Cluster = require("cluster")
			, defaultConfig = {
				cpus: require("os").cpus().length,
				schedulingPolicy: Cluster.SCHED_RR,
				port: 10096,
				path: "html/",
				uploadDir: "tmp/",
				proxys: {

				},
				cache: 0,
				gzip: 0
			};
		function Server(config) {
			this.config = latte_lib.merger(defaultConfig, config);
		};
		latte_lib.inherits(Server, latte_lib.events);
		(function() {
			this.doSlave = this.doMaster = function() {

			}
		}).call(Server.prototype);
		module.exports = Server;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });