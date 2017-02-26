var latte_lib = require("latte_lib");
var superClass = require("latte_load");
var latte_verify = require("latte_verify");
var verifyConfig = {
	type: "object",
	properties: {
		
	}
};
var Web = function(config, server) {
	this.befores = [];
	this.afters = [];
	this.clean();
	this.server = server;
	superClass.call(this, config);
	this.config = latte_verify.verify(config, verifyConfig);
};
latte_lib.extends(Web, superClass);
(function() {

	this.clean = function() {
		superClass.prototype.clean.call(this);
		this.gets = {};
		this.posts = {};
		this.getRegs = [];
		this.postRegs = [];
	}
	var  _self = this;
	["get", "post"].forEach(function(type) {
		_self[type] = function(path) {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(type);
			_self.set.apply(this, args);
		}
	});
	this.set = function(type, path, config) {
		var self = this;
		var handles ;
		if(latte_lib.isFunction(config)) {
			config = {};
			handles = Array.prototype.slice.call(arguments, 2);
		}else{
			handles = Array.prototype.slice.call(arguments, 3);
		}
		handles.forEach(function(fn) {
			if(!latte_lib.isFunction(fn)) {
				throw new Error(path + "," + type + "handle has not function !!")
			}
		});

		if(this[type + "s"]) {
			this[type + "s"][path] = function(ctx) {
				var fns = handles.map(function(fn) {
					return function(callback) {
						fn.call(self, ctx , callback)
					}
				});
				latte_lib.async.series(fns, function(err, result) {
					if(err) {
						self.emit("error", err, latte);	
					}
				});
			}
			this[type + "s"][path].config = config;
		}	
		
	}



		var pathReg = function(path) {
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
		var handles ;
		if(latte_lib.isFunction(config)) {
			config = {};
			handles = Array.prototype.slice.call(arguments, 2);
		}else{
			handles = Array.prototype.slice.call(arguments, 3);
		}
		handles.forEach(function(fn) {
			if(!latte_lib.isFunction(fn)) {
				throw new Error("setReg" + path + "," + type + "handle has not function!!");
			}
		});
		if(this[type + "s"]) {
			var object = pathReg(path);
			object.action = function(latte) {
				var fns = handles.map(function(fn) {
					return function(callback) {
						fn.call(self, req, res, callback);
					}
				});
				latte_lib.async.series(fns, function(err, result) {
						if(err) {
							self.emit("error", err, latte);	
						}
				});
			}
			this[type + "s"][path].config = config;
		}
	};

	["getReg", "portReg"].forEach(function(type) {
		_self[type] = function(path) {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(type);
			_self.setReg.apply(this, args);
		}
	});
		var getArgument = function(o, type ) {
			var config = o.config ? o.config[type]? o.config[type] : o.config : {}; 
			var args = [o.path , config];
			//if(config) { args.push(config); }
			if(latte_lib.isArray(o[type])) {
				args = args.concat(o[type]);
			}else{
				args.push(o[type]);
			}
			return args;
		}
	this.load = function(path, o) {
		var self = this;
		if( !o.path) { return;}
		
		["get", "post" , "getReg", "postReg"].forEach(function(type) {
			if(o[type]) {

				var args = getArgument(o, type);
				self[type].apply(self, args);
			};
		});
		//console.log(this);
	}
	
	this.send = function(ctx, callback) {
		var self = this;
		var fns = this.afters.map(function(fn) {
			return function(cb) {
				fn.call(self.server, ctx, cb);
			}
		});
		latte_lib.async.parallel(fns, function(err) {
			if(err) {
				return self.emit("error", err);
			}
			callback();
		});
	} 
	this.run = function(fn, ctx) {
		var self = this;
		var _send = ctx.send.bind(ctx);
		var config = latte_lib.copy(fn.config);
		ctx.config = config;
		ctx.send = function(data) {
			//self.server.logger.local();
			self.send(ctx,function() {
				_send(data);
			});	
		};
		
		var fns = this.befores.map(function(f) {
			return function(callback) {
				f.call(self.server, ctx, callback);
			}
		});
		latte_lib.async.parallel(fns, function(err) {
			if(err) { return self.emit("error", err); }
			fn.call(self.server, ctx);
		});

	}

	this.request = function(ctx, next) {
		var self = this;
		var pathname = ctx.pathname;
		switch(ctx.req.method.toLowerCase()) {
			case "post": 
				if(self.posts[pathname]) {
					
					self.run(self.posts[pathname], ctx);

					return
				}else{
					for(var i = 0, len = this.postRegs.length; i < len; i++) {
						var regs = this.postRegs[i];
						var matched = regs.regexp.exec(pathname);
						if(matched) {
							var keys = regs.keys;
							for(var i = 0, l = keys.length ; i < l; i++) {
								var value = matched[i + 1];
								if(value) {
									ctx.gets[keys[i]] = value;
								}
							}
							self.run(regs.action, req, res);
							return 1;
						}

					}
				}
			break;
			case "get":
				
				if(self.gets[pathname]) {
					return self.run(self.gets[pathname], ctx);
				}else{
					for(var i = 0, len = this.getRegs.length; i < len; i++) {
						var regs = this.getRegs[i];
						var matched = regs.regexp.exec(pathname);
						if(matched) {
							var keys = regs.keys;
							for(var i = 0, l = keys.length ; i < l; i++) {
								var value = matched[i + 1];
								if(value) {
									ctx.gets[keys[i]] = value;
								}
							}
							self.run(regs.action, req, res);
							return 1;
						}

					}
				}
			break;
		}
		next();
	}
	this.before = function(fn) {
		if(latte_lib.isFunction(fn)) {
			this.befores.push(fn);
		}
	}
	this.after = function(fn) {
		if(latte_lib.isFunction(fn)) {
			this.afters.unshift(fn);
		}
	}
	//逻辑修改
	//先before最先执行   先after后执行
	//after是插去到前面的
	this.use = function(opts) {
		//this.before(opts.before.bind(opts));
		//if(opts.before && latte_lib.isFunction(opts.before)) {
		//	this.befores.unshift(opts.before.bind(opts));
		//}
		opts.before && this.before(opts.before.bind(opts));
		opts.after && this.after(opts.after.bind(opts));
	}
}).call(Web.prototype);
module.exports = Web;