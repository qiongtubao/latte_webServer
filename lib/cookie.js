(function(define) { 'use strict';
	define("latte_web/cookie", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		(function() {
			var utils = require("./utils");
			var Cookies = require("./cookie/index");
			this.before = function(req, res, next) {
				if(req.cookies) {
					return next();
				}
				var cookie = req.headers.cookie;
				req.cookies = new Cookies(cookie);
				next();
			}
			this.after = function(req, res, next) {
				var cookies = req.cookies;
				utils.set( res, "Set-Cookie", cookies.getSetCookie())
				next();
			}
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });