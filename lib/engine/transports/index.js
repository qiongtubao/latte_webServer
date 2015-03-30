(function(define) { "use strict";
	define("latte_web/engine/transports", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var XHR = require("./polling-xhr")
		, JSONP = require("./polling-jsonp")
		, latte_lib = require("latte_lib");
		function polling(req) {
			if(latte_lib.isString(req.gets.j)) {
				return new JSONP(req);
			} else {
				return new XHR(req);
			}
		};
		(function() {
			this.upgradesTo = ["websocket"];
		}).call(polling);
		(function() {
			this.polling = polling;
			this.websocket = require("./websocket");
		}).call(module.exports);
	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });