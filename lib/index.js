(function(define) { 'use strict';
	define("latte_web/cluster/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var Cluster = require("cluster");
		if(Cluster.isMaster) {
			module.exports = require("./server/master");
		}else{
			module.exports = require("./server/slave");
		}
		

	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });