var latte_lib = require("latte_lib");
var superClass = require("../utils/rpc");
var Rpc = function(config, server) {
	superClass.call(this, config);
	this.workers = [];
	var self = this;
	this.on("error", function(err) {
		server.logger.rpcError(err);
	});
};
latte_lib.extends(Rpc, superClass);
(function() {
	this.removeWorker = function(worker) {
		var index = this.workers.indexOf(worker);
		this.workers[index] = null;
	}
	this.addWorker = function(worker) {
		this._addWorker( worker);
		this.workers[worker.id] = worker;
		worker.rpc = this;
	}
	this.send = function(data, socket) {
		
		if(this.worker) {
			this.worker.send(data, socket);
		}else{
			this.sendCaches.push({
				data: data,
				socket: socket
			});
		}
	}
	this.load = function(path, o) {
		if(o.master) {
			this.setMethod(o.method, o.master);
		}
	}
	
	this.Call = function(worker, method, params, socket, cb) {
		var id = ++ this.id;
		if(latte_lib.isFunction(socket)) {
			cb = socket;
			socket = null;
		}
		worker.send({
			method: method,
			params: params,
			id: id
		}, socket);
		cb && this.once(id, function(err, data) {
			cb(err, data);						
		});
	}
	this.CallAll = function(method, params, socket, cb){
		if(latte_lib.isFunction(socket)) {
			cb = socket;
			socket = null;
		}
		var self = this;
		var funcs = [];

		this.workers.forEach(function(worker) {
			if(!worker) {
				return;
			}
			funcs.push(function(callback) {
				self.Call(worker, method, params, socket, callback);
			});
		});

		latte_lib.async.parallel(funcs, function(err, data) {
			//console.log("callbackAll",data);
			cb(err, data);
		});
	}
}).call(Rpc.prototype);
module.exports = Rpc;