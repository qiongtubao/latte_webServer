(function(define) { 'use strict';
	define("latte_webServer/post/querystringParser", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {
			var latte_lib = require("latte_lib")
				, fs = require("fs")
				, path = require("path")
				, WriteStream = require("fs").WriteStream
				, EventEmitter = latte_lib.events;
			function File(properties) {
				EventEmitter.call(this);
				this.size = 0;
				this.path = null;
				this.name = null;
				this.type = null;
				this.lastModifiedDate = null;
				this._writeStream = null;
				for(var key in properties) {
					this[key] = properties[key];
				}
				this._backwardsCompatibility();
			};
			latte_lib.inherits(File, EventEmitter);
			(function() {	
				this._backwardsCompatibility = function() {
					var self = this;
					this.__defineGetter__('length', function() {
						return self.size;
					});
					this.__defineGetter__('filename', function() {
						return self.name;
					});
					this.__defineGetter__('mime', function() {
						return self.type;
					});
				}
				this.write = function(buffer, cb) {
					var self = this;
					this._writeStream.write(buffer, function() {
						self.lastModifiedDate = new Date();
						self.size += buffer.length;
						self.emit("progress", self.size);
						cb();
					});
				}
				this.end = function(cb) {
					var self = this;
					this._writeStream.end(function() {
						self.emit("end");
						cb();
					});
				}
				this.open = function() {
					this._writeStream = new WriteStream(this.path);
				}
				this.rename = function(newFileName, callback) {
					var nowPath = path.normalize(this.path+"/../"+newFileName);
					var self = this;
					fs.rename(this.path, nowPath , function(err) {
						if(err) {return callback(err);}
						self.path = nowPath;
						callback(err);
					});
				}
			}).call(File.prototype);
			this.File = File;
		}).call(module.exports);
		
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });