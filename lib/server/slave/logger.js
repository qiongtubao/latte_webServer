var latte_lib = require("latte_lib");
var Logger = function(config) {

};
(function() {
	this.rpcError = function(err) {
		latte_lib.debug.error("serverSlaveError:",err);
	}
	this.serverError = function(err) {
		latte_lib.debug.error("serverError:",err);
	}
	this.webError = function(err) {
		latte_lib.debug.error("webError:", err);
	}
	this.local = function() {
		try{
			throw new Error();
		}catch(e) {
			latte_lib.debug.error(e.stack);
		}
	}
}).call(Logger.prototype);
module.exports = Logger;