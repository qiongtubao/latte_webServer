(function(define) { 'use strict';
	define("latte_web/rpc/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, ORPC = require("./rpc")
			, Cluster = require("cluster");
		function RPC(methods) {
			ORPC.call(this, methods);
			this.addWorker(Cluster.worker);		
		};
		latte_lib.inherits(RPC, ORPC);
		(function() {
			this.addWorker = function(worker) {
				this.worker = worker;
				ORPC.prototype.addWorker.call(this, this.worker);
			}
			this.write = function(data,handle) {
				this.worker.process.send(data, handle);
			}
		}).call(RPC.prototype);
		module.exports = RPC;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });