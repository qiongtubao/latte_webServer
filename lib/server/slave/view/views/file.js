var Mines = require("../../../utils/mines");

var latte_verify = require("latte_verify");
var fs = require("latte_lib").fs;
var latte_lib = require("latte_lib");
var Path = require("path");
var verifyConfig = {
	type: "object" ,
 	properties: {
		pathname: {
			type: "string",
			verify: function(data) {
				return fs.existsSync(data);
			}
		}
	}
	
};
module.exports = function(config, ctx) {
	if(latte_lib.isString(config)) {
		config = {
			pathname: config
		};
	}
	config = latte_verify.verify(config, verifyConfig);
	var pathname = config.pathname;
	var fileType = Path.extname(config.pathname);

	var res = ctx.res;
	res.setHeader("Content-Type", Mines.getFileType(fileType) || "application/octet-stream");
	var stat ;
	var stat;
	try{
		stat = latte_lib.fs.statSync(config.pathname);
	}catch(e) {
		return ctx.send(e);
	}
	var lastModified = stat.mtime.toUTCString();
	var req = ctx.req;
	
	if( req && req.headers["If-Modified-Since"] && lastModified == req.headers["If-Modified-Since"]) {
		res.statusCode = 304;
		return null;
	}else{
		res.setHeader("Last-Modified", lastModified);
		if(config && config.cache) {
			
			var expires = new Date();
			var maxAge = config.cache || 0;
			expires.setTime(expires.getTime() + maxAge * 1000);
			res.setHeader("Expires", expires.toUTCString());
			res.setHeader("Cache-Control", "max-age=" + maxAge);

		}
		var stream = require("fs").createReadStream(pathname, {
			flag: "r",
			autoClose: true
		});
		var Zlib = require("zlib");

		if(config && config.gzip && stat.size > config.gzip) {

			var acceptEncoding = req.headers["accept-encoding"];
			if(acceptEncoding.match(/\bgzip\b/)) {
				res.setHeader("Content-Encoding", "gzip");
				//stream.pipe(Zlib.createGzip().pipe(res));
				return stream.pipe(Zlib.createGzip());
			}else if(acceptEncoding.match(/\bdeflate\b/)) {
				res.setHeader("Content-Encoding", "deflate");
				//stream.pipe(Zlib.createDeflate()).pipe(res);
				return stream.pipe(Zlib.createDeflate());
			}else{
				//stream.pipe(res);
				return ctx.send(stream);
			}

		}else{
			//stream.pipe(res);
			return ctx.send(stream);
		}
	}
};