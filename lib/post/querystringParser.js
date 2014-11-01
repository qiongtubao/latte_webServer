(function(define) { 'use strict';
	define("latte_webServer/post/querystringParser", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {
			var querystring = require("querystring");
			function QuerystringParser() {
				this.buffer = "";
			}
			function QuerystringParser() {
				this.buffer = "";
			};
			(function() {
				this.write = function(buffer) {
					this.buffer += buffer.toString("ascii");
					return buffer.length;
				};
				this.end = function() {
					var fields = querystring.parse(this.buffer);
					for(var field in fields) {
						this.onField(field, fields[field]);
					}
					this.buffer = "";
					this.onEnd();
				}
			}).call(QuerystringParser.prototype);
			this.QuerystringParser = QuerystringParser;
		}).call(module.exports);
		
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });