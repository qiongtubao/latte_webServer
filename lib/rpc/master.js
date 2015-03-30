(function(define) { 'use strict';
	define("latte_web/rpc/master", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var	latte_lib = require("latte_lib")
			, ORPC = require("./rpc");
		function RPC(methods) {
			this.workers = [];
			ORPC.call(this, methods);
		};
		latte_lib.inherits(RPC, ORPC);
		(function(){
				
			this.addWorker = function(worker) {
				ORPC.prototype.addWorker.call(this, worker);
				this.workers.push(worker);
			}
			this.CallAll = function(method, params, socket, cb) {
				var self = this;
				var funcs = this.workers.map(function(worker) {
					return function(callback) {
						self.Call(worker, method, params, socket, function(error, data, socket) {
							callback(null, {
								error: error,
								data: data,
								handle: handle,
								worker: worker
							});
						});
					};
				});
				latte_lib.async.parallel(funcs, function(all) {
					cb(null, all);
				});
			}
			this.Call = function(worker, method, params, socket, cb) {
				var id = ++this.id;
				worker.send({
					method: method,
					params: params,
					id: id
				},socket);
				if(latte_lib.isFunction(socket)) {
					cb = socket;
					socket = null;
				}
				cb && this.once(id, cb);
			}
		}).call(RPC.prototype);
		module.exports = RPC;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });