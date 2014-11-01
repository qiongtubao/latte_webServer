(function(define) { 'use strict';
	define("latte_webServer/cookie/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		//(function() {
			var latte_lib = require("latte_lib");
			var encode = encodeURIComponent;
			var decode = decodeURIComponent;
			var crypto =require("crypto");
				var Sign = function(val, secret) {
					if("string" != typeof val) throw new TypeError("cookie required");
					if("string" != typeof secret) throw new TypeError("secret required");
					return 	val+"."+crypto
						.createHmac("sha256", secret)
						.update(val)
						.digest("base64")
						.replace(/\=+$/,"");
				}
					var sha1 = function(str) {
						return crypto.createHash("sha1").update(str).digest("hex");
					}
				var Unsign = function() {
					if("string" != typeof val) throw new TypeError("cookie required");
					if("string" != typeof secret) throw new TypeError("secret required");
					var str = val.slice(0, val.lastIndexOf("."))
						, mac = Sign(str, secret);
					return sha1(mac) == sha1(val) ? str: false;
				}
				var JSONCookies = function(obj) {
					var cookies = latte_lib.keys(obj);
					var key, val;
					for(var i = 0; i < cookies.length; i++) {
						key = cookies[i];
						val = JSONCookie(obj[key]);
						if(val) {
							obj[key] = val;
						}
					}
					return obj;
				};
				var JSONCookie = function(str) {
					if(!str || str.substr(0,2) !== "j:") {
						return ;
					}
					try {
						return JSON.parse(str.slice(2));
					} catch(err) {

					}
				};
				var SignedCookies = function(obj, secret) {
					var cookies = latte_lib.keys(obj);
					var dec , key, ret = Object.create(null), val;
					for(var i = 0; i < cookies.length; i++) {
						key = cookies[i];
						val = obj[key];
						dec = SignedCookie(val, secret);
						if(val !== dec) {
							ret[key] = dec;
							delete obj[key];
						}
					}
					return ret;
				};
				var SignedCookie = function(str, secret) {
					return str.substr(0 , 2) === "s:"
						? Unsign(str.slice(2), secret)
							: str;
				} ;
			function Cookies(str, opts, secret) {
				this.secret = secret;
				var cookies = JSONCookies(DecodeCookie(str, opts));
				var signedCookies = JSONCookies(SignedCookies(cookies, secret));
				this.cookies = cookies;
				this.signedCookies = signedCookies;
			};
			(function() {
				this.add = function(key, value, options) {
					this.cookies[key] = value;
					options = options || {};
					var signed = options.signed;
					if(signed && !secret) {
						throw new Error('cookieParser("secret") required for signed cookies');;
					}
					if("number" == typeof val) {
						val = val.toString();
					}
					if("object" == typeof val) {
						val = "j:" + JSON.stringify(val);
					}
					if(signed) {
						val = "s:" + sign(val, secret);
					}
					if("maxAge" in options) {
						options.expires = new Date(Date.now)
						options.maxAge /= 1000;
					}
					if(null == options.path) {
						options.path = "/";
					}
					var headerVal = EncodeCookie(key, String(value), options);
					//var prev = this.get("Set-Cookie");
					var prev = this.setCookies || [];
					
					if(Array.isArray(prev)) {
						headerVal = prev.concat(headerVal);
					} else {
						headerVal = [prev, headerVal];
					}
					
					//this.set("Set-Cookie", headerVal);
					this.setCookies = headerVal;
				}
				this.set = function(func) {
					func(this.setCookies);
				}
				this.get = function(key) {
					return this.cookies[key];
				}	
				this.clear = function(key, opts) {
					opts = opts || {};
					opts.expires = new Date(1);
					opts.path = "/";
					delete this.cookies[key];
					this.add(key, "". opts);
				}

			}).call(Cookies.prototype);
			var DecodeCookie = function(str, opts) {
				opts = opts || {};
				var obj = {};
				if(!str) {
					return obj;
				}

				var pairs = str.split(/; */);
				var dec = opts.decode || decode;
				pairs.forEach(function(pair) {
					var eq_idx = pair.indexOf("=");
					if(eq_idx < 0) {
						return;
					}
					var key = pair.substr(0, eq_idx).trim();
					var val = pair.substr(++eq_idx, pair.length).trim();
					if('"'==val[0]) {
						val = val.slice(1, -1);
					}
					if(undefined == obj[key]) {
						try {
							obj[key] = dec(val);
						} catch(e) {
							obj[key] = val;
						}
					}

				});
				return obj;
			}
			var EncodeCookie = function(name, val, opts) {
				opts = opts || {};
				var enc = opts.encode || encode;
				var pairs = [name+"="+enc(val)];
				if(null != opts.maxAge) {
					var maxAge = opts.maxAge - 0;
					if(isNaN(maxAge)) throw new Error('maxAge should be a Number');
					pairs.push("Max-Age="+maxAge);
				}
				if(opts.domain) {
					pairs.push("Domain="+opts.domain);
				}
				if(opts.path) {
					pairs.push("Path="+opts.path);
				}
				if(opts.expires) {
					pairs.push("Expires="+opts.expires.toUTCString());
				}
				if(opts.httpOnly) {
					pairs.push("HttpOnly");
				}
				if(opts.secure) {
					pairs.push("Secure");
				}
				return pairs.join("; ");
			}
		//}).call(module.exports);
		module.exports = Cookies;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });