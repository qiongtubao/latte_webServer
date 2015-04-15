(function(define) { 'use strict';
	define("latte_web/slave", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var OServer = require("./server")
			, latte_lib = require("latte_lib")
			, Domain = require("domain")
			, Url = require("url")
			, Querystring = require("querystring")
			, Http = require("http")
			, latte_lib = require("latte_lib")
			, Path = require("path")
			, Mines = require("../mines")
			, Post = require("../post")
			, Engine = require("../engine")
			, Cluster = require("cluster")
			, RPC = require("../rpc/slave");
		function Server(config) {
			OServer.call(this, config);
			this.gets = {};
			this.posts = {};
			this.getRegs = [];
			this.postRegs = [];
			this.befores = [];
			this.afters = [];
			this.engines = {};
			var self = this;
			this.rpc = new RPC();		
			var self = this;
			self.rpc.Set("http", function(socket) {
				socket.readable = socket.writeable = true;
				socket.resume();
				self.server.connection++;
				socket.server = self.server;
				self.server.emit("connection", socket);
				socket.emit("connect");
			});
		};
		latte_lib.inherits(Server, OServer);
		(function() {
			var _self = this;
			var getErrorString = function(err) {
				return (err.stack? err.stack.toString() : err.toString());
			}
			this.doSlave = function(fn) {
				fn();
			}
			this.engine = function(path, fn) {
				var engine = new Engine(path);
				this.engines[path] = engine;
				fn && engine.on("connection", fn);
				return engine;
			}
			this.run = function() {
				var self = this
					, serverDomain = Domain.create();
				serverDomain.on("error", function(err) {
					if(self.config.log) {
						var filename = "./logs/otherError/"+latte_lib.format.dateFormat()+".log";
						latte_lib.fs.writeFile(filename, getErrorString(error));
					}else{
						throw err;
					}
				});
				serverDomain.run(function() {
					var server = self.server = Http.createServer(function(req, res) {
						var reqd = Domain.create();
						reqd.add(req);reqd.add(res);
						reqd.on("error", function(err) {
							res.setHeader("Content-Type","text/plan");
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
					server.on("upgrade", function(req, socket, head) {
						self.onUpgrade(req, socket, head);
					});
					self.rpc.Call("startHttp",[]);
					
					

				});
			}
			this.onUpgrade = function(req, socket, head) {
				var url = Url.parse(decodeURIComponent(decodeURIComponent(req.url)));
				var pathname = url.pathname;
				var self = this;
				if(self.engines[pathname]) {
					req.gets = Querystring.parse(url.query);
					self.engines[pathname].handleUpgrade(req, socket, head);
				}else{
					if (socket.writable && socket.bytesWritten <= 0) {
		             	return socket.end();
		           	}
				}
			}
			
			this.before = function(fn) {
				if(latte_lib.isFunction(fn)) {
					this.befores.push(fn);
				}
			}
			this.after = function(fn) {
				if(latte_lib.isFunction(fn)) {
					this.afters.push(fn);
				}
			}
			this.use = function(opts) {
				this.before(opts.before.bind(opts));
				this.after(opts.after.bind(opts));
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
			};
			["get", "post"].forEach(function(type) {
				_self[type] = function(path) {
					var args = Array.prototype.slice.call(arguments);
					args.unshift(type);
					_self.set.apply(this, args);
				}
			});
			/**
			 *  http send
			 */
			this.onRequestSend = function(data, req, res) {
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
				})
			}
			this.request = function(fn, req, res) {
				var self = this;
				res.send = function(data) {
					self.onRequestSend(data, req, res);
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
			};
			["getReg", "postReg"].forEach(function(type) {
				_self[type] = function(path) {
					var args = Array.prototype.slice.call(arguments);
					args.unshift(type);
					_self.setReg.apply(this, args);
				}
			});
			this.pathReg = function(path) {
				var keys = [];
				path = path.concat("/?")
					.replace(/\/\(/g,"(?:/")
					.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
						slash = slash || "";
						keys.push(key);
						return ""
							+ (optional? "": slash)
							+ "(?:"
							+ (optional? slash: "")
							+ (format || "") + (capture || (format && "([^/.]+?)" || "([^/]+?)")) + ")"
							+ (optional || "")
							+ (star? "(/*)?": "");
					})
					.replace(/([\/.])/g, "\\$1")
					.replace(/\*/g, "(.*)");
				return {
					keys : keys,
					regexp: new RegExp("^" + path + "$")
				};
			}
			this.setReg = function(type, path) {
				var self = this;
				var handles = Array.prototype.slice.call(arguments, 2);
				handles.forEach(function(fn) {
					if(!latte_lib.isFunction(fn)) {
						throw new Error("setReg"+path + "," + type + "handle has not function!!");
					}
				});
				if(this[type+"s"]) {
					var object = this.pathReg(path);
					object.action = function(req, res) {
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
					};
					this[type+"s"].push(object);
				}
			}
			this.onRequest = function(req, res) {
				var self = this;
				var url = Url.parse(decodeURIComponent(decodeURIComponent(req.url)));
				var pathname = url.pathname;
				if(self.engines[pathname]) {
					req.gets = Querystring.parse(url.query);
					self.engines[pathname].handleRequest(req, res);
					return;
				}				
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
							for(var i = 0, len = this.postRegs.length; i < len; i++) {
								var regs = this.postRegs[i];
								var matched = regs.regexp.exec(pathname);
								if(matched) {
									return this.getPostData(req, function(err, data) {
										req.posts = data;
										req.gets = Querystring.parse(url.query);
										var keys = regs.keys;
										for(var i = 0, l = keys.length; i < l; i++) {
											var value = matched[i+1];
											if(value) {
												req.gets[keys[i]] = value;
											}
										}
										self.request(regs.action, req, res);
									});									
								}
							}

							this.proxyWeb(pathname, req, res);
						} 
						
					break;
					case "get":
						
						if(self.gets[pathname]) {
							req.gets = Querystring.parse(url.query);
							req.posts = {};
							return self.request(self.gets[pathname], req, res);
						}else{
							for(var i = 0, len = this.postRegs.length; i < len; i++) {
								var regs = this.getRegs[i];
								var matched = regs.regexp.exec(pathname)
								if(matched) {
									req.posts = {};
									req.gets = Querystring.parse(url.query);
									var keys = regs.keys;
									for(var i = 0, l = keys.length; i < l; i++) {
										var value = matched[i+1];
										if(value) {
											req.gets[keys[i]] = value;
										}
									}
									return self.request(regs.action, req, res);
								}
							}
							self.staticFile(pathname, req, res);
						}
						
						/*res.writeHead(404);
						res.end("no the get");*/
					break;
				}
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
			this.proxyWeb = function(pathname, req, res) {
				var onError = function() {
					res.writeHead(404);
					res.end("not find");
				}
				if(this.config.proxyUrl) {
					var type = req.method.toLowerCase();
					latte_lib.xhr[type](
						this.config.proxyUrl+pathname, 
						req[type+"s"], {
						headers: req.headers
					}, function(data, headers) {
						res.end();
					}, function(error) {
						onError()
					}).on("chunk", function(data) {
						res.write(data);
					}).on("headers", function(headers) {
						for(var i in headers) {
							res.setHeader(i, headers[i]);
						}
					});
				}else{
					onError();
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
					res.setHeader("Content-Type", Mines.getFileType(fileType) || "application/octet-stream");
					require("fs").stat(path, function(err, stat) {
						var lastModified =  stat.mtime.toUTCString();
						if(req.headers["If-Modified-Since"] && lastModified == req.headers["If-Modified-Since"]) {
							response.statusCode = 304;
    						response.end();
						}else{
							res.setHeader("Last-Modified", lastModified);
							if(self.config.cache) {
								var expires = new Date();
								var maxAge = self.config.cache || 0;
								expires.setTime(expires.getTime() + maxAge* 1000);
								res.setHeader("Expires", expires.toUTCString());
								res.setHeader("Cache-Control", "max-age=" + maxAge);
							}
							var stream = require("fs").createReadStream(path, {
								flag:"r",
								autoClose: true
							});
							if(self.config.gzip && 
								stat.size > self.config.gzip ) {
								var acceptEncoding = req.headers['accept-encoding']
								if(acceptEncoding.match(/\bgzip\b/)) {
									res.setHeader("Content-Encoding", "gzip");
									stream.pipe(Zlib.createGzip().pipe(res));
								}else if(acceptEncoding.match(/\bdeflate\b/)) {
									res.setHeader("Content-Encoding", "deflate");
									stream.pipe(Zlib.createDeflate()).pipe(res);
								}
							}else{
								stream.pipe(res);
							}
						}
						
					});
				
					
				});
			}
		}).call(Server.prototype);
		module.exports = Server;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });