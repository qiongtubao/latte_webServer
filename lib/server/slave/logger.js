var Logger = function(config) {

};
(function() {
	this.rpcError = function(err) {
		console.log("serverSlaveError:",err);
	}
	this.serverError = function(err) {
		console.log("serverError:",err);
	}
	this.webError = function(err) {
		console.log("webError:", err);
	}
	this.info = console.info;
	this.local = function() {
		try{
			throw new Error();
		}catch(e) {
			console.log(e.stack);
		}
	}
}).call(Logger.prototype);
module.exports = Logger;