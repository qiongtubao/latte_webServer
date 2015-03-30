(function(define) { "use strict";
	define("latte_web/engine/transports/websocket", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var Parser = require("../parse")
			, Transport = require("../transport")
			, latte_lib = require("latte_lib");
		function WebSocket(req) {
			Transport.call(this, req);
			var self = this;
			this.socket = req.websocket;
			this.socket.on("message", this.onData.bind(this));
			this.socket.once("close", this.onClose.bind(this));
			this.socket.on("error", this.onError.bind(this));
			this.socket.on("headers", function(headers) {
				self.emit("headers", headers);
			});
			this.writable = true;
		};
		latte_lib.inherits(WebSocket, Transport);
		(function() {
			this.name = "websocket";

			this.handlesUpgrades = !0;
			this.supportsFraming = !0;
			this.onData = function(data) {
				Transport.prototype.onData.call(this, data);
			}
			this.send = function(packets) {
				var self = this;
				for(var i = 0, l = packets.length; i < l; i++) {
					Parser.encodePacket(packets[i], this.supportsBinary, function(data) {
						self.writable = false;
						self.socket.send(data, function(err) {
							self.writable = true;
							self.emit("drain");
						});
					});
				}
			}
			this.doClose = function(fn) {
				this.socket.close();
				fn && fn();
			}
		}).call(WebSocket.prototype);
		module.exports = WebSocket;
	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });