var latte_lib = require("latte_lib")
	, latte_verify = require("latte_verify");
	
module.exports = function(json, ctx) {
	ctx.send(JSON.stringify(json));
};