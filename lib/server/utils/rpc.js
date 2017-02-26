var latte_lib = require("latte_lib");
var superClass = require("latte_load");
var ORPC = function(config) {
	superClass.call(this, config);
	
};
latte_lib.extends(ORPC, superClass);
(function() {
	this.dataFormat = function(err, result, id) {
		return {
			error: err,
			result: result,
			id: id
		}
	};
	this.init = function() {
		this.methods = {};
		this.id = 0;
		superClass.prototype.init.call(this);
	}
	this.clean = function() {
		superClass.prototype.clean.call(this);
		this.methods = {};
		this.id = 0;
	}
	this.setMethod = function(method, func) {
		this.methods[method] = func;
	}
	this.Call = function(method, params, socket, cb) {
		var self = this;
		if(latte_lib.isFunction(socket)) {
			cb = socket;
			socket = null;
		}
		this.write({
			method: method, 
			params: params,
			id : ++self.id
		}, socket);
		if(cb) {
			this.once(self.id, cb);
		}
	}
	this.backData = function(err, result, id) {
          return {
            error: err,
            result : result,
            id: id
          };
      }
	this._addWorker = function(worker) {
		var self = this;
		worker.rpc = this;
		return worker.process.on("message", function(data, socket) {

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
					data.params.push(function(err, result, s) {
						worker.send(self.backData(err, result, data.id), s);
					});
					try {
						method.apply(worker, data.params);
					}catch(e) {
						self.emit("error", e);
						console.log("orpc: e");
					}

				}else if(data.id) {
					self.emit(data.id, data.error, data.result, socket);
				}
			}else if(data.id) {
             
              self.emit(data.id, data.error, data.result, socket);
            }
		});
	}
}).call(ORPC.prototype);
module.exports = ORPC;