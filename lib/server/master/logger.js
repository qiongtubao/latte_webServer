var latte_lib = require("latte_lib");
var Logger = function(config) {

};
(function() {
	this.rpcError = function(err) {
		latte_lib.debug.log("serverMasterError:",err);
	}
	
	this.info = latte_lib.debug.info.bind(latte_lib.debug);
	this.local = function() {
		
	}
}).call(Logger.prototype);
module.exports = Logger;