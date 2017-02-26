var  latte_lib = require("latte_lib")
	, Path = require("path")
	, Mines = require("../../utils/mines")
	, latte_verify = require("latte_verify");
var verifyConfig = {
	type: "object",
	properties: {
		paths: {
			type: "object"
		},
		indexs: {
			type: "array",
			default: ["index.html"]
		},
		cache: {
			type: "boolean",
			default : false
		}
	},
	default: {
		paths: {}
	}
};
var Static = function(config) {
	this.config = latte_verify.verify(config, verifyConfig);
	this.filters = {};
};
latte_lib.extends(Static, latte_lib.events);
(function() {
	this.addFilter= function(name, func) {
		this.filters[name] = func;
	}
	/**
		怎么匹配更好
	*/
	this.findFile = function(path, callback) {
		var self = this;
		var last = path.slice(-1);
		if(last == "/" || last == "\\") {
			var indexs = this.config.indexs || ["index.html"];
			var funs = indexs.map(function(obj) {
				return function(cb) {
					var p = path + obj;
					latte_lib.fs.exists(p, function(exist) {
						if(exist) {
							return cb(p);
						}else{
							cb();
						}
						
					});
				}
			});
			latte_lib.async.series(funs, function(file) {
				callback(file);
			});
		} else {
			latte_lib.fs.exists(path, function(exist) {
				if(exist) {
					var stat = latte_lib.fs.lstatSync(path);
					if(stat.isFile() || stat.isSymbolicLink()) {
						return callback(path);
					}else{
						return self.findFile(path+"/", callback);
					}
					//return callback(path);
				}else{
					callback();
				}
				
			});
		}
	}
	this.request = function(ctx, next) {
		var pathname = ctx.pathname;
		var path;

		for(var i in this.config.paths) {
			if(pathname.indexOf(i) == 0 && ( !path || path.length< i.length)) {
				path = i;
			}	
		}
		var self = this;
		if(path) {
			
			var filePath = pathname.replace(path, this.config.paths[path]); 
			
			this.findFile(filePath, function(newPath) {
				if(!newPath) {
					return next();
				}
				var filter = self.filters[Path.extname(newPath).substring(1)];
				if(filter) {
					return ctx.send(filter(newPath));
				}
				
					//var stream = require("../../view/types/file.js").render(newPath, req, res, this.config);
					ctx.view("file", { 
						pathname : newPath 
					});
					//if(stream && stream.pipe) {
					//	return stream.pipe(ctx.res);
					//}else {
						//res.write(stream, "utf8");
					//	ctx.end(stream.toString("utf8"));
					//}
					
				
				
			});
			
		}else{
			next();
		}
		
		
	}
	
}).call(Static.prototype); 
module.exports = Static;