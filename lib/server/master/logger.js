var Logger = function(config) {

};
(function() {
	this.rpcError = function(err) {
		console.log("serverMasterError:",err);
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