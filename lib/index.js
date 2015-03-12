(function(define) { 'use strict';
	define("latte_web/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		var Cluster = require("cluster")
			, Domain = require("domain")
			, Url = require("url")
			, Querystring = require("querystring")
			, Http = require("http")
			, latte_lib = require("latte_lib")
			, Path = require("path")
			, Mines = require("./mines")
			, Post = require("./post");
		var defaultConfig = {
			cpus: require("os").cpus().length,
			schedulingPolicy: 2,
			port: 10096,
			path: "html/",
			uploadDir: "tmp/",
			proxys: {

			}
		};
		function Server(config) {
			this.config = latte_lib.merger(defaultConfig, config);
			this.gets = {};
			this.posts = {};
			this.befores = [];
			this.afters = [];
		};
		latte_lib.inherits(Server, latte_lib.events);
		(function() {
			this.before = function(fn) {
				this.befores.push(fn);
			}
			this.after = function(fn) {
				this.afters.push(fn);
			}
			this.use = function(opts) {
				if(latte_lib.isFunction(opts.before)) {
					this.before(opts.before.bind(opts));
				}
				if(latte_lib.isFunction(opts.after)) {
					this.after(opts.after.bind(opts));
				}
			}
			this.set = function(type, path) {
				var self = this;
				var handles = Array.prototype.slice.call(arguments, 2);
				handles.forEach(function(fn) {
					if(!latte_lib.isFunction(fn)) {
						throw new Error(path + "," + type + "handle has not function!!");
					}
				});
				if(this[type+"s"]) {
					this[type+"s"][path] = function(req, res) {
						var fns = handles.map(function(fn) {
							return function(callback) {
								fn(req, res, callback);
							};
						});
						latte_lib.async.series(fns, function(err, result) {
							if(err) {
								res.end(err);
							}
						});
					}
				}
			}
			var self = this;
			["get", "post"].forEach(function(type) {
				self[type] = function(path) {
					var args = Array.prototype.slice.call(arguments);
					args.unshift(type);
					this.set.apply(this, args);
				}
			});
			/**
				发送消息
			*/
			this.send = function(data, req, res) {
				var fns = this.afters.map(function(fn) {
					return function(callback) {
						fn(req, res, callback);
					};
				});
				latte_lib.async.parallel(fns, function(err) {
					if(err) {
						throw err;
					}
					res.end(data.toString());
				});
			}
			/**
				执行函数操作
			*/
			this.request = function(fn, req, res) {
				var self = this;
				res.send = function(data) {
					self.send(data, req, res);
				};
				var fns = this.befores.map(function(f) {
					return function(callback) {
						f(req, res, callback);
					};
				});
				latte_lib.async.parallel(fns, function(err) {
					if(err) {
						throw err;
					}
					fn( req, res);
				});
			}
				this.getPostData = function(req, callback) {
					var self = this;
					var post = new Post({
							uploadDir: self.config.uploadDir
						})
						, posts = {
							_files: []
						};
					post
					.on("error", function(err) {
						callback(err);
					})
					.on("field", function(field, value) {
						posts[field] = value;
					})
					.on("file", function(filename, file) {
						posts._files.push(file);
					})
					.on("text", function(data) {
						posts._text = data;
					})
					.on("end", function() {
						callback(null, posts);
					});
					post.parse(req);
				}
			this.onRequest = function(req, res) {
				var self = this;
				var url = Url.parse(decodeURIComponent(decodeURIComponent(req.url)));
				var pathname = url.pathname;
				switch(req.method.toLowerCase()) {
					case "post":
						if(self.posts[pathname]) {
							this.getPostData(req, function(err, data) {
								if(err) { throw err; }
								req.posts = data;
								req.gets = Querystring.parse(url.query);
								self.request(self.posts[pathname], req, res);
 							});
						}else{
							this.proxyWeb(pathname, req, res);
						}
						
					break;
					case "get":
						if(self.gets[pathname]) {
							req.gets = Querystring.parse(url.query);
							req.posts = {};
							return self.request(self.gets[pathname], req, res);
						}
						self.staticFile(pathname, req, res);
						/*res.writeHead(404);
						res.end("no the get");*/
					break;
				}
			}

			this.proxyWeb = function(pathname, req, res) {
				if(this.config.proxyUrl) {
					var type = req.method.toLowerCase();
					latte_lib.xhr[type](
						this.config.proxyUrl+pathname, 
						req[type+"s"], {
						headers: req.headers
					}, function(data, headers) {
						for(var i in headers) {
							res.setHeader(i, headers[i]);
						}
						res.end(data);
					}, function(error) {
						res.writeHead(404);
						res.end("not find");
					});
				}else{
					res.writeHead(404);
					res.end("not find");
					return;
				}
			}

			this.findFile = function(path, callback) {
				var last = path.slice(-1);
				if(last == "/" || last == "\\") {
					var indexs = this.config.indexs || ["index.html"];
					var funs = indexs.map(function(obj) {
						return function(cb) {
							var p = path + obj;
							latte_lib.fs.exists(p, function(exist) {
								if(exist) {
									return cb(p);
								}
								cb();
							});
						}
					});
					latte_lib.async.series(funs, function(file) {
						callback(file);
					});
				} else {
					latte_lib.fs.exists(path, function(exist) {
						if(exist) {
							return callback(path);
						}
						callback();
					});
				}
			};

			this.staticFile = function(pathname, req, res) {
				var self = this;
				var paths = pathname.split("/");
				var proxy	 = this.config.proxys[paths[1]];
				var mpath;
				if(proxy) {
					var ps = paths.splice(2);
					mpath = Path.normalize(proxy + "/" + ps.join("/"));
				} else{
					mpath = Path.normalize(self.config.path + pathname);
				}
				self.findFile(mpath, function(path) {
					if(!path) {
						self.proxyWeb(pathname, req, res);
						return
					}
					var fileType = Path.extname(path);
					res.setHeader("Content-Type", Mines.getFileType(fileType));
					var stream = require("fs").createReadStream(path, {
						flag:"r",
						autoClose: true
					});
					stream.pipe(res);
				});
			}

			/**
				302重定向
			*/

			this.doMaster = function(cb) {
				if(Cluster.isMaster) {
					cb();
				}
			}
			this.doSlave = function(cb) {
				if(!Cluster.isMaster) {
					cb();
				}
			}

			this.createWork = function() {
				var worker = Cluster.fork();
				var self = this;
				this.emit("start", worker);
				worker.on("message", function(data) {
					self.emit(data.type, data.data);
				});
				return worker;
			}
			var getErrorString = function(err) {
				return (err.stack? err.stack.toString() : err.toString());
			}

			if(Cluster.isMaster) {
				this.run = function() {
					Cluster.schedulingPolicy = Cluster.SCHED_RR;
					var self = this;
					for(var i = 0, len = this.config.cpus; i < len; i++) {
						self.createWork();
					}
					Cluster.on("exit", function(worker, code, signal) {
						//console.log(worker.process.pid, code, signal);			
						var newWorker = self.createWork();
						Cluster.emit("restart", worker, newWorker);
					});
					this.on("all", function(data) {
						self._sendAll(data);
					});

				}
				this._send = function(id, data) {
					Cluster.workers[id].process.send(data);
				}
				this._sendAll = function(data) {
					var self = this;				
					for(var i in Cluster.workers) {
						this._send(i, data);
					}		
				}

			}else{
				this._send = function(data) {
					Cluster.worker.send(data);
				}
				this._sendAll = function(data) {
					this._send({
						type: "all",
						data: data
					});
				}
				this.run = function() {
					var self = this
					, serverDomain = Domain.create();
					Cluster.worker.process.on("message", function(data) {
						self.emit(data.type, data.data);
					});
					serverDomain.on("error", function(err) {
						if(self.config.log) {
							var filename = "./logs/otherError/"+latte_lib.format.dateFormat()+".log";
							latte_lib.fs.writeFile(filename, getErrorString(error));
						}else{
							throw error;
						}
					});
					serverDomain.run(function() {
						var server = self.server = Http.createServer(function(req, res) {
							var reqd = Domain.create();
							reqd.add(req);reqd.add(res);
							reqd.on("error", function(err) {
								res.end(getErrorString(err));
								if(self.config.log) {
									var filename = "./logs/webError/"+latte_lib.format.dateFormat()+".log";
									latte_lib.fs.writeFile(filename, 
										req.url + "\n"
										+ "gets:" + latte_lib.format.jsonFormat(req.gets) + "\n"
										+ "posts:" + latte_lib.format.jsonFormat(req.posts) + "\n"
										+ getErrorString(err)
									);
								}else{
									throw err;
								}
							});
							reqd.run(function() {
								self.onRequest(req, res);
							});
						});
						server.listen(self.config.port);
						
					});

				}
			}
			

			
		}).call(Server.prototype);
		module.exports = Server;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });