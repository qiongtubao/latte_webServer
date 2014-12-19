(function(define) { 'use strict';
	define("latte_webServer/cookie", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		
			var Cookie = require("./cookie")
				, Session = require("./session/session").Session
				, crypto = require("crypto")
				, Store = require("./session/store").Store
				, Headers = require("./headers")
				, latte_lib = require("latte_lib");
				var UIDCHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
				function tostr(bytes) {
					var chars, r;
					r = [];
					for(var i = 0; i < bytes.length;i++) {
						r.push(UIDCHARS[bytes[i] % UIDCHARS.length]);
					}
					return r.join("");
				}
				function uid(length, cb) {
					if(typeof cb === "undefined") {
						return tostr(crypto.pseudoRandomBytes(length));
					} else {
						crypto.pseudoRandomBytes(length, function(err, bytes) {
							if(err) return cb(err);
							cb(null, tostr(bytes));
						});
					}
				}
			function SessionParser(opts) {
				this.key = opts.key || "latte.sid";
				this.store = opts.store || new Store();
			};
			(function() {
				this.before = function(req, res ,next) {
					var self = this;
					if(!req.cookies) {
						throw new Error("you not set cookies");
					};
					var key = req.sessionId =  req.gets.sessionId || req.cookies.get(this.key)  ;
					req.sessionStore = this.store;
					function reset() {
						req.sessionId = key = uid(24);
						//Headers.setCookie(req, res, self.key, key);
						req.cookies.add(self.key, key);
						req.session = new Session();
						next();
					}
					if(!key) {
						reset();
					} else {
						this.store.get(key, function(err, data) {
							if(err) { throw err;}
							if(!data) {
								return reset();
							}

							req.session = data;

							next();
						});
					}

				};
				this.after = function(req, res, next) {
					//var key = req.cookies.get(this.key);
					var key = req.sessionId;
					this.store.set(key, req.session, function(err, data) {
						if(err) {
							throw err;
						}
						next();
					});

				}
				
			}).call(SessionParser.prototype);
			module.exports = function(opts) {
				var s = new SessionParser(opts);
				return s;
			};
		(function() {
			this.redisStore = require("./session/redisStore").redisStore;

		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });