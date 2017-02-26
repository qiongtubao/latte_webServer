var latte_verify = require("latte_verify");
var Path = require("path");
var latte_lib = require("latte_lib");
var verifyConfig = {
	type: "object",
	properties: {

	}
}
var View = function(config) {
	this.config = latte_verify.verify(config, verifyConfig);
	this.status = {};
	this.views = {}
	this.init();
};
(function() {
	this.init = function() {
		var viewFiles = latte_lib.fs.readdirSync(__dirname + "/views");
		var self = this;
		viewFiles.forEach(function(typeFile) {
			self.setView(Path.basename(typeFile, ".js"), require("./views/" + typeFile));
		});
		var statusFiles = latte_lib.fs.readdirSync(__dirname + "/status");
		statusFiles.forEach(function(statusFile) {
			self.setStatus(Path.basename(statusFile, ".js"), require("./status/"+ statusFile));
		});
	}
	this.setView = function(type, handle) {
		this.views [type ] = handle;
	}
	this.getView = function(type) {
		return this.views[type];
	}
	this.setStatus = function(status, handle) {
		this.status[status] = handle;
	}
	this.getStatus = function(type, data) {
		return this.status[type];
	}
	this.view = function(type, data) {

	}
	this.add = function() {
		
	}
}).call(View.prototype);
module.exports = View;