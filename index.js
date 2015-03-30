(function(define) { 'use strict';
	define("latte_web", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		module.exports = require("./lib");
		(function() {
			this.Session = require("./lib/session");
			this.Cookie = require("./lib/cookie");
			this.Origin = require("./lib/utils").Origin;
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });