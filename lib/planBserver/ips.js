(function(define) { 'use strict';
	define("latte_web/server/ips", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, removeIdle = latte_lib.removeIdle;
		function Ips() {
			this.data = {};
			var self = this;
			removeIdle.call(this, {
				destroy: function(object) {
					for(var i in self.data) {
						if(self.data[i] == object) {
							delete self.data[i];
						}
					}
				},
				idleTimeoutMillis: 60000
			})
		};
		latte_lib.inherits(Ips, removeIdle);
		(function() {
			this.add = function(address, worker) {
				var value = this.data[address] = {
					worker: worker
				};
				this.release(value);
			}
			this.has = function(address) {
				return this.data[address];
			}
			this.get = function(address) {
				var value =  this.data[address];
				this.getIdle(value);
				return value;
			}
			this.delete = function(address) {
				this.destrory(this.data[address]);
			}
		}).call(Ips.prototype);
		module.exports = Ips;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });