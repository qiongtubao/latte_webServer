(function(define) { 'use strict';
	define("latte_web/cluster/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var Cluster = require("cluster");
		/*
		 planA 
		 if(Cluster.isMaster) {
			module.exports = require("./planAserver/master");
		}else{
			module.exports = require("./planAserver/slave");
		}*/
		/*
		 planB
		 if(Cluster.isMaster) {
			module.exports = require("./planBserver/master");
		}else{
			module.exports = require("./planBserver/slave");
		}*/
		module.exports = require("./planAserver/server");

	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });