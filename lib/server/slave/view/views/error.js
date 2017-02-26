var latte_lib = require("latte_lib")
	, latte_verify = require("latte_verify");
	var getErrorString = function(err) {
		if(err.stack) {
			return err.stack.toString();
		}else if(latte_lib.isString(err)) {
			return err.toString();
		}else{
				var errorString;
				try {
						errorString = JSON.stringify(err);
				}catch(e){
						var Util = require("util");
						errorString = Util.inspect(err);
				}
				return errorString;
		}
	}

module.exports = function(error, ctx) {
	ctx.send(getErrorString(error));
};