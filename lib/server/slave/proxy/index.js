var latte_lib = require("latte_lib");
var latte_verify = require("latte_verify");
var verifyConfig = {
	type: "object", 
	properties: {
		paths: {
			type: "object"
		}
	},
	default: {
		paths : {

		}
	}
}
var Proxy =function(config) {
	this.config = latte_verify.verify(config, verifyConfig);
};
latte_lib.extends(Proxy, latte_lib.events);
(function() {

	this.request = function(ctx, next) {
		
		var type = ctx.req.method.toLowerCase();	
		var path ;
		var pathname = ctx.pathname;
		for(var i in this.config.paths) {
			if(pathname.indexOf(i) == 0 && ( !path || path.length< i.length)) {
				path = i;
			}	
		}
		
		if(path) {
			//res.handleType = "proxy";
			var newPathname = pathname.substring(path.length);
			var req = ctx.req;
			var res = ctx.res;
			latte_lib.xhr[type](
				(this.config.paths[path].indexOf("http") != -1 ? this.config.paths[path] : "http://"+this.config.paths[path]) + newPathname,
				req[type+"s"],
				{
					headers: req.headers
				},
				function(data, headers) {
					res.end();
				}
			).on("chunk", function(data) {
				res.write(data, "utf8");
			}).on("headers", function(headers) {
				for(var i in headers) {
					res.setHeader(i, headers[i]);
				}
			}).on("err", function(error) {
				console.log(error);
			});
			
		}else{
			next();
			return;
		}
	}
}).call(Proxy.prototype);
module.exports = Proxy;