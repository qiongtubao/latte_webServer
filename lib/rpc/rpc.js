(function(define) { 'use strict';
	define("latte_web/rpc/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib");
		function RPC(methods) {
			this.methods = methods || {};
			this.id = 0;
		};
		latte_lib.inherits(RPC, latte_lib.events);
		(function() {
			this.Call = function(handle, params, socket, cb) {
				var self = this;
				if(latte_lib.isFunction(socket)) {
					cb = socket;
					socket = null;
				}
				this.write({
					method: handle,
					params: params,
					id: ++self.id
				}, socket);
				if(cb) {
					this.once(self.id, cb);
				}
			}
			this.Set = function(method, func) {
				this.methods[method] = func;
			}
				var backData = function(err, result, id) {
					return {
						error: err,
						result: result,
						id: id
					};
				}
			this.addWorker = function(worker) {
				var self = this;
				worker.process.on("message", function(data, socket) {
					if(socket) { 
						socket.readable = socket.writeable = true;
						socket.resume();
					}
					if(data.method) {
						var method = self.methods[data.method];
						if(method) {
							if(!latte_lib.isArray(data.params)) {
								data.params = [].concat(data.params);
							}
							socket && data.params.push(socket);
							data.params.push(function(err, result, s){
								worker.send(backData(err, result, data.id), s);
							});
							method.apply(worker, data.params);
						}
						
					}else if(data.id) {
						self.emit(data.id, data.error, data.result, socket);
					}
				});
			}
		}).call(RPC.prototype);
		module.exports = RPC;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });