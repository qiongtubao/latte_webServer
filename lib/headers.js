(function(define) { 'use strict';
	define("latte_webServer/headers", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {
			
			this.getCookie = function(req ,key) {
				var cookie = req.headers["Set-Cookie"] || req.headers["cookie"];
				if(cookie) {
					var cookies = cookie.split(";");
					var jsons = {};
					cookies.forEach(function(obj) {
						var os = obj.split("=");
						jsons[os[0]] = os[1];
					});
					return jsons[key];
				}
				return null;
				
			}
			this.cookie = function(name, val, options) {
				options = mixin({}, options);
				var secret = this.req.secret;
				var signed = options.signed;
				if(signed && !secret) throw new Error('cookieParser("secret") required for signed cookies');
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
					options.expires = new Date(Date.now() + options.maxAge);
					options.maxAge /= 1000;
				}
				if(null == options.path) {
					options.path = "/";
				}
				var headerVal = cookie.serialize(name, String(val), options);
				var prev = this.get("Set-Cookie")
				//  {
				// 	if (Array.isArray(prev)) {
				//       headerVal = prev.concat(headerVal);
				//     } else {
				//       headerVal = [prev, headerVal];
				//     }
				// }
				this.set('Set-Cookie', headerVal);
  				return this;
			}
			this.get = function(res, key) {
				return res.getHeader(key);
			}
			/*this.setCookie = function(req, res, key, value) {
				var cookie = req.headers["cookie"];
				cookie = cookie || "";
				cookie += key+"="+value;
				req.headers["Cookie"] = cookie;
				res.setHeader("Set-Cookie",[key+"="+value]);
				console.log(res.getHeader("Set-Cookie"));

			}*/
			this.setCookie = function(res, val) {
				this.set(res, "Set-Cookie", val);
			}
			this.set = function(res, key, val) {
				if(arguments.length == 3) {
					if(Array.isArray(val)) {
						val = val.map(String);
					} else {
						val = String(val);
					}
					/*if("content-type" == field.toLowerCase() && !/;\s*charset\s*=/.test(val)) {
						var charset = mime.charsets.lookup(val.split(';')[0]);
						if(charset) val += "; charset="+ charset.toLowerCase();
					}*/
					res.setHeader(key, val);
				} else {
					for(var field in key) {
						this.set(field, key[key]);
					}
				}
				
			}
			this.getContentType = function(req) {
				var headers = req.headers;
				if(!headers["content-type"]){
					return null;
				}
				if(headers["content-type"].match(/octet-stream/i)) {
					return "octet-stream";
				}
				if(headers["content-type"].match(/urlencoded/i)) {
					return "urlencoded";
				}
				if(headers["content-type"].match(/multipart/i)) {
					return "multipart";
				}
				if(headers["content-type"].match(/json/i)) {
					return "json";
				}
				if(headers["content-type"].match(/text/i)) {
					return "text";
				}
			}
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });