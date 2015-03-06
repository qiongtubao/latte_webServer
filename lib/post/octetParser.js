(function(define) { 'use strict';
	define("latte_webServer/post/octetParser", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {
			var latte_lib = require("latte_lib")
				, events = latte_lib.events;
			function OctetParser(options) {

			};
			latte_lib.inherits(OctetParser, events);
			(function() {
				this.write = function(buffer) {
					this.emit("data", buffer);
					return buffer.length;
				}
				this.end = function() {
					this.emit("end");
				}
			}).call(OctetParser.prototype);
			this.OctetParser = OctetParser;
		}).call(module.exports);
		
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });