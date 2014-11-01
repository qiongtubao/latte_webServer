(function(define) { 'use strict';
	define("latte_webServer/index", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		//(function() {
			var url = require("url")
			, Path = require("path")
			, http = require("http")
			, fs = require("fs")
			, queryString = require("querystring")
			, latte_lib = require("latte_lib")
			, mines = require("../config/mines")
			, Post = require("./post").Post;;
			function Server(config) {
				config = config || {};
				this.lattePath = Path.relative(__dirname, process.cwd() )+"/";
				try{
					this.ServerConfig = require(this.lattePath + (config.configPath || "config/latte.json"))
				}catch(e) {
					if(e.code == "MODULE_NOT_FOUND") {
						this.ServerConfig = {	
							port: 10086,
							path: "html/",
							httpServer: {
								indexs: ["index.html"],
								virtualDirectorys:{

								}
							}
						};
					}else{
						throw e;
					}
					
				};
				this.ServerConfig.httpServer = this.ServerConfig.httpServer || {virtualDirectorys:{}};

				this.gets = config.gets || {};
				this.posts = config.posts || {};
				this.befores = [];
				this.afters = [];

				var self = this;
				fs.readdirSync(__dirname+"/../handle").forEach(function(file) {
					var handle = require("../handle/" + file);
					var fileName = Path.basename(file, ".js");
					self.gets["/latte/" + fileName] = handle.get;
					self.pots["/latte/" + fileName] = handle.post;
				});
				
			};
			(function() {
				this.findFile = function(path, callback) {
					var last = path.slice(-1);
					if(last === "/" || last === "\\" ) {
						var indexs = this.ServerConfig.httpServer.indexs || ["index.html"];
						var funs = indexs.map(function(obj) {
							return function(cb) {
								var p = path + obj;
								fs.exists(p, function(exist) {
									if(exist) {
										return cb(p);
									}
									cb();								
								});
							}
							
						});
						latte_lib.async.series(funs, function(file){
							callback(file);
						});
					}else {
						fs.exists(path, function(exist) {
							if(exist) {
								return callback(path);
							}
							callback();
						});
					}
					
				}
				this.staticFile = function(p, req, res) {
					var self = this;
					var paths = p.split("/");
					var virtualDirectory = this.ServerConfig.httpServer.virtualDirectorys[paths[1]];
					var mpath = "";
					if(virtualDirectory) {
						var ps = paths.split(2);
						mpath = Path.normalize(virtualDirectory.path + "/" + ps.join("/"));
					} else {
						mpath = Path.normalize(self.ServerConfig.path+p);
					}
					self.findFile(mpath,  function(path){
						if(!path) {
							res.end("no find");
							return;
						};
						var fileType = Path.extname(path);
						res.setHeader("Content-Type", mines[fileType]);
						var stream = fs.createReadStream(path, {
							flags: 'r',
							autoClose: true
						});
						stream.pipe(res);
					});
				}
				this.run = function() {
					var self = this;
					
					http.createServer(this.onRequest().bind(this)).listen(self.ServerConfig.port);
				}
				this.getGetData = function(req, callback) {
					var data = queryString.parse(req.url.query);
					callback(null, data);
				}
				this.getPostData = function(req, callback) {
					
					var post = new Post(),
				   	 posts = {};
				   	post.uploadDir = "./tmp";
				    post
				      .on('error', function(err) {
				        callback(err);
				      })
				      .on('field', function(field, value) {
				        posts[field] = value;
				      })
				      .on("file", function(field, value){
				      	posts[field] = value;
				      })
				      .on('end', function() {
				        callback(null,posts);
				      });
				    post.parse(req);
				}
				this.onRequest = function() {
					var self = this;
					return function( req, res ) {
						var pathname = req.url;
						if(req.method.toLowerCase() == "post") {
							self.getPostData(req, function(err, data) {
								if(err) {
									console.log(err);
									return res.end("error");
								}
								req.posts = data;
								req.gets = {};
								if(self.posts[pathname]) {
									self.request(self.posts[pathname], req, res);
								}
							});
						}else if(self.gets[pathname]) {
							self.getGetData(req, function(err, data) {
								if(err) {
									console.log(err);
									return res.end(err);
								}
								req.gets = data;
								req.posts = {};
								if(self.gets[pathname]) {
									self.request(self.gets[pathname], req, res);
								}								
							});
							
						}else {
							res.send = res.end;
							self.staticFile(pathname, req, res);
						}
					};
				}
				this.request = function(fn, req, res) {
					var self = this;
					res.send = function(data) {
						self.send(data, req, res);
					};
					var fns = this.befores.map(function(f) {
						return function(callback) {
							f(req, res, callback);
						}
					})
					latte_lib.async.parallel(fns, function(err) {
						if(err) {
							console.log("before error");
							throw err;
						}
						fn(req, res);
					});
				};
				this.send = function(data, req, res) {
					var fns  = this.afters.map(function(fn) {
						return function(callback) {
							fn(req, res, callback);
						};
					});
					latte_lib.async.parallel(fns, function(err) {
						if(err) {
							console.log("after error");
							throw err;
						}
						res.end(data);
					});
				}
				this.use = function(opts) {
					if(latte_lib.isFunction(opts.before)) {
						this.before(opts.before.bind(opts));
					} 
					if(latte_lib.isFunction(opts.after)) {
						this.after(opts.after.bind(opts));
					}
				}
				this.before = function(fn) {
					this.befores.push(fn);
				}
				this.after = function(fn) {
					this.afters.push(fn);
				}
				this.set = function(type, path) {				 
					var self = this;
					var handles = Array.prototype.slice.call(arguments, 2);
					if(this[type+"s"]) {
						this[type+"s"][path] = function(req, res) {
							var fns = handles.map(function(fn) {
								return function(callback) {
									fn(req, res, callback);
								};
							});
							latte_lib.async.series(fns, function(err, result) {
								if(err) {
									console.log("get middle ",err);
									res.end(err);
								}
							});
						};
					}
					
				}
				this.get = function(path) {
					var args = Array.prototype.slice.call(arguments);
					args.unshift("get");

					this.set.apply(this,args);
				}
				this.post = function() {
					var args = Array.prototype.slice.call(arguments);
					args.unshift("post");
					this.set.apply(this,args);
				}
				this.forward = function (type , url , req, res) {

				}
			}).call(Server.prototype);

		//}).call(module.exports);
		module.exports = Server;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });