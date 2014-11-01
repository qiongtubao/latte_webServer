(function(define) { 'use strict';
	define("latte_webServer/session/store", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {
			var latte_lib = require("latte_lib");
			function Session(data) {
				this.data = data || {};
				
			};
			(function() {

			}).call(Session.prototype);
			this.Session = Session;
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });