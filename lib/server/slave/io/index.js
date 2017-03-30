var latte_verify = require("latte_verify");
var latte_lib = require("latte_lib");
var Io = require("./io");
var verifyConfig = {
	type: "object",
	default: {}
};
var Ios = function(config) {
	this.config = latte_verify.verify(config, verifyConfig);
	this.all = {};
	this.init();
};
latte_lib.extends(Ios, latte_lib.events);
(function() {
	this.init = function() {
		for(var k in this.config) {
			this.add(k, this.config[k]);
		}

	}
	this.add = function(path, opts, fn) {
		if(latte_lib.isFunction(opts)) {
			fn = opts;
			opts = {};
		}
		var io = this.all[path] = new Io(path, opts);
		fn && io.on("connection", fn);
		return;
	}
	this.get = function(path){
		return this.all[path];
	}
	var Url = require("url");
	this.request = function(ctx, next) {
		var pathname = ctx.pathname;
		if(this.all[pathname]) {
			this.all[pathname].handleRequest(ctx);
			return ;
		}else{
			next();
		}
			
	}
	this.handleUpgrade = function(ctx, socket, head) {
		
		var  self = this;
		if(self.all[ctx.pathname]) {
			
			self.all[ctx.pathname].handleUpgrade(ctx, socket, head);
		}
	}
}).call(Ios.prototype);
module.exports = Ios;