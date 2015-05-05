(function(define) { 'use strict';
	define("latte_web/master", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var OServer = require("./server")
			, Cluster = require("cluster")
			, latte_lib = require("latte_lib")
			, RPC = require("../rpc/master")
			, Ips = require("./ips")
			, Engine = require("../engine");
		function Server(config) {
			OServer.call(this, config);
			this.workers = [];
			this.ips = new Ips();
			this.socketCache = [];
			this.num = 0;
			this.rpc = new RPC();
			this.engines = new Engine();
			var self = this;
			Cluster.schedulingPolicy = this.config.schedulingPolicy || Cluster.SCHED_NONE;
			this.rpc.Set("startHttp", function() {
				self.workers.push(this);
				self.emit("startHttp", this);
				var cache ;
				var worker = this;
				/*while(cache = self.socketCache.shift()) {
					self.rpc.Call(worker, "http", [], cache);
				}*/
			});
		};
		latte_lib.inherits(Server, OServer);
		(function() {
			this.engine = function(path, fn) {
				this.engines.all[path] = {};
				return this.engines;
			}
			this.doMaster = function(fn) {
				fn();
			}
			this.getWorker = function(socket) {
				if(this.workers.length == 0) {
					return null;
				}
				if( this.sched ) {
					this.num =(this.num++) % this.workers.length;
					return this.workers[this.num];
				}
				var address = socket.address().address;
				if(this.ips.has(address)) {
					var o =  this.ips.get(address);
					this.ips.release(o);
					return o.worker;
				}else {
					this.num =(this.num++) % this.workers.length;
					var worker =  this.workers[this.num];
					this.ips.add(address, worker);					
					return worker;
				}
			}
			this.createWorker = function() {
				var worker = Cluster.fork();
				this.emit("start", worker);
				this.rpc.addWorker(worker);

				return worker;
			}
			this.run = function() {
				var self = this;
				for(var i = 0, len = this.config.cpus; i < len; i++) {
					var worker = self.createWorker();
				}
				Cluster.on("exit", function(worker, code, signal) {
					var index = self.workers.indexOf(worker);
					if(index != -1) {
						self.workers.splice(index, 1);
					}
					self.createWorker();
				});
				var net = require("net");
				this.sched = !Object.keys(this.engines.all);
				/*this.server = net.createServer(function(socket) {
					socket.pause();
					var worker = self.getWorker(socket);
					if(worker) {
						self.rpc.Call(worker, "http", [], socket);
					}else{
						socket.on("close", function() {
							var index = self.socketCache.indexOf(socket) ;
							if(index != -1) {
								self.socketCache.splice(index, 1);
							}
						});
						self.socketCache.push(socket);
					}
				}).listen(this.config.port);*/
			}
		}).call(Server.prototype);
		module.exports = Server;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });