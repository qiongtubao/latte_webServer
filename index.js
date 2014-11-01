(function(define) { 'use strict';
	define("latte_webServer/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		module.exports = require("./lib/server");
		(function() {
			this.session = require("./lib/session");
			this.cookie = require("./lib/cookie");
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });