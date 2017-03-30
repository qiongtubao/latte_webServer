var latte_lib = require("latte_lib");
(function() {
	var _self = this;
	this.set = function(res, field, val) {
		if(arguments.length === 3) {
			if(latte_lib.isArray(val)) {
				val = val.map(String);
			}else{
				val = String(val);
			}
			//暂时没设计到设置content-type的程度
			/*if("content-type" == field.toLowerCase() && !/;\scharset*\s*=/.test(val)) {
				var charset = mime.charsets.lookup(val.split(";")[0]);
				if(charset) val += "; charset=" + charset.toLowerCase();
			}*/
			res.setHeader(field, val);
		} else {
			for(var key in field) {
				this.set(res, key, field[key]);
			}
		}
		return res;
	}
	this.Origin = function(ctx, next) {
		var headers = {};
		if (ctx.req.headers.origin) {
	      headers['Access-Control-Allow-Credentials'] = 'true';
	      headers['Access-Control-Allow-Origin'] = ctx.req.headers.origin;
	    } else {
	      headers['Access-Control-Allow-Origin'] = '*';
	    }
	    _self.set(ctx.res, headers);
	    next && next();
	}
}).call(module.exports);