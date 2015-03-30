(function(define) { "use strict";
	define("latte_web/engine/transport", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, events = latte_lib.events
			, Parser = require("./parse");
		function noop() {};
		function Transport(req) {
			this.readyState = "opening";
			//this.req = req;
		};
		latte_lib.inherits(Transport, events);
		(function() {
			this.onRequest = function(req) {
				this.req = req;
			}
			this.close = function(fn) {
				this.readyState = "closing";
				this.doClose(fn || noop);
			}
			this.onError = function(msg, desc) {
				if(this.listeners("error").length) {
					var err = new Error(msg);
					err.type = "TransportError";
					err.description = desc;
					this.emit("error", err);
				}
			}
			this.onPacket = function(packet) {
				this.emit("packet", packet);
			}
			this.onData = function(data) {
				this.onPacket(Parser.decodePacket(data));
			};
			this.onClose = function() {
				this.readyState = "closed";
				this.emit("close");
			}
		}).call(Transport.prototype);	
		module.exports = Transport;
	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });