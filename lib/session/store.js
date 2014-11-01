(function(define) { 'use strict';
	define("latte_webServer/session/store", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {	
			var latte_lib = require("latte_lib");
			var Session = require("./session");	
			var removeIdle = latte_lib.removeIdle;
			function Store(opts) {
				this.sessions = {};
				var self = this;
				opts = opts || {};
				removeIdle.call(this, {
					destroy: function(object) {			
						for(var i in self.sessions) {
							if(self.sessions[i] == object) {
								delete self.sessions[i];
							}
						}
					},
					idleTimeoutMillis:  opts.idleTimeoutMillis || 60000
				});
			};
			latte_lib.inherits(Store,removeIdle);
			(function() {
				this.get = function(sid, fn) {
					var value = this.sessions[sid];
					if(value) {
						this.getIdle(value);
						fn(null, value);
					}else{
						fn("no the session");
					}
					
				}
				this.set = function(sid, session, fn) {
					this.sessions[sid] = session;
					this.release(session);
					fn();
				}
				this.createSession = function() {
					return new Session();
				}
			}).call(Store.prototype);
			this.Store = Store;
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });