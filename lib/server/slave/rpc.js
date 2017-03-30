
var latte_lib = require("latte_lib");
var superClass = require("../utils/rpc");
var Cluster = require("cluster");
var Rpc = function(config, server) {
	superClass.call(this, config);
	this.addWorker(Cluster.worker);
	var self = this;
	this.server =server;
};
latte_lib.extends(Rpc, superClass);
(function() {
	this.load = function(path, o) {
		if(o.slave && o.method) {
			this.setMethod(o.method, o.slave);
		}
	}
	this.addWorker = function(worker) {
		this.worker = worker;
		this._addWorker( worker)
		
	}
	this.write = function(data, handle) {
		this.worker.process.send(data, handle);
	}
}).call(Rpc.prototype);
module.exports = Rpc;