(function(define) { 'use strict';
	define("latte_webServer/cookie", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var Cookie = require("./cookie/index")
			, Headers = require("./headers");
		function CookieParser(secret, opts) {
			this.opts = opts;
			this.secret = secret;
		};		
		(function() {
			this.before = function(req, res, next) {
				if(req.cookies) {
					return next();
				}
				var cookies = req.headers.cookie;
				//req.cookies = {};
				//if(!cookies) {
				//	return next();
				//}
				req.cookies = new Cookie(cookies, this.opts, this.secret);
				next();
			}
			this.after = function(req, res, next) {
				//req.cookies.set(res);
				var cookies = Headers.get(res, "Set-Cookie") || [];
				req.cookies.set(function(obj) {
					if(obj) {

						cookies = obj.concat(cookies);
						Headers.set(res, "Set-Cookie",cookies);
					}
				});
				next();
			}
		}).call(CookieParser.prototype);
		module.exports = function(secret, opts) {
			var cookie = new CookieParser(secret, opts);
			return cookie;
		}
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });