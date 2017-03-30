var latte_verify = require("latte_verify");
var latte_lib = require("latte_lib");
var Rpc = require("./rpc");
var Cluster = require("cluster");
var basicServer = require("../utils/server");
var Logger = require("./logger");
var verifyConfig = {
	type: "object",
	properties: {
		cpus: {
			type: "integer",
			min: 1,
			default:  1 || require("os").cpus().length 
		},
		schedulingPolicy: {
			type : "integer",
			default: Cluster.SCHED_NONE
		}
	}
}
var Server = function(config) {
	this.config = latte_verify.verify(config, verifyConfig);
	this.logger = new Logger(this.config.logger, this);
	this.rpc = new Rpc(this.config.rpc, this);
};
latte_lib.extends(Server, basicServer);
(function() {
	this.run = function() {
		if(this.server) { return ; }
		var self = this;
		for(var i = 0, len = this.config.cpus; i < len; i++) {
			self.createWebWorker();
		}
		Cluster.on("exit", function(worker) {
			self.rpc.removeWorker();
			if(self.config.restart) {
				var now = self.createWebWorker();
				self.emit("restart", worker, now);
			}
		});
	}

	this.createWebWorker = function() {
		Cluster.schedulingPolicy = Cluster.SCHED_NONE;
		var worker = Cluster.fork();
		this.emit("start", worker);
		this.addRpcClient(worker);
		return worker;
	}

	this.addRpcClient = function(worker) {
		this.rpc.addWorker(worker);
	}
	this.doMaster = function(func) {
		func();
	}
}).call(Server.prototype);
module.exports = Server;
