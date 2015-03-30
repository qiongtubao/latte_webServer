(function(define) { "use strict";
	define("latte_web/engine/socket", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, events = latte_lib.events;
		function Socket(id, server, transport, req) {
			this.id = id;
			this.server = server;
			this.upgraded = false;
			this.readyState = "opening";
			this.writeBuffer = [];
			this.packetsFn = [];
			this.sentCallbackFn = [];
			this.request = req;
			this.checkIntervalTimer = null;
			this.upgradeTimeoutTimer = null;
			this.pingTimeoutTimer = null;
			this.setTransport(transport);
			this.onOpen();
		};
		latte_lib.inherits(Socket, events);
		(function() {
			this.onOpen = function() {
				this.readyState = "open";
				this.transport.sid = this.id;

				this.sendPacket("open", JSON.stringify({
					sid: this.id
					, upgrades: this.getAvailableUpgrades()
					, pingInterval: this.server.pingInterval
					, pingTimeout: this.server.pingTimeout
				}));

				this.emit("open");
				this.setPingTimeout();
			};
			this.onPacket = function(packet) {
				if("open" == this.readyState) {
					this.emit("packet", packet);
					this.setPingTimeout();
					switch(packet.type) {
						case "ping":
							this.sendPacket("pong");
							this.emit("hearbeat");
						break;
						case "error":
							this.onClose("parser error");
						break;
						case "message":
							this.emit("data", packet.data);
							this.emit("message", packet.data);
						break;
					}
				}
			}
			this.onError = function(err) {
				this.onClose("transport error", err);
			}
			this.setPingTimeout = function() {
				var self = this;
				clearTimeout(self.pingTimeoutTimer);
				self.pingTimeoutTimer = setTimeout(function() {
					self.onClose("ping timeout");
				}, self.server.pingInterval + self.server.pingTimeout);
			}
			this.setTransport = function(transport) {
				this.transport = transport;
				this.transport.once("error", this.onError.bind(this));
				this.transport.on("packet", this.onPacket.bind(this));
				this.transport.on("drain", this.flush.bind(this));
				this.transport.once("close", this.onClose.bind(this, "transport close"));
				this.setupSendCallback();
			}
			this.maybeUpgrade = function(transport) {
				var self = this;
				//console.log("ok");
				self.upgradeTimeoutTimer = setTimeout( function() {
					clearInterval(self.checkIntervalTimer);
					self.checkIntervalTimer = null;
					if("open" == transport.readyState) {
						transport.close();
					}
				}, this.server.upgradeTimeout);
				function onPacket(packet) {
					if("ping" == packet.type && "probe" == packet.data) {
						transport.send([{type: "pong", data: "probe"}]);
						clearInterval(self.checkIntervalTimer);
						self.checkIntervalTimer = setInterval(check, 100);
					} else if("upgrade" == packet.type && self.readyState == "open") {
						self.upgraded = true;
						self.clearTransport();
						self.setTransport(transport);
						self.emit("upgrade", transport);
						self.setPingTimeout();
						self.flush();
						clearInterval(self.checkIntervalTimer);
						self.checkIntervalTimer = null;
						clearTimeout(self.upgradeTimeoutTimer);
						transport.removeListener("packet", onPacket);
					} else {
						transport.close();
					}
				}
				function check() {
					if("polling" == self.transport.name && self.transport.writable) {
						self.transport.send([{type: "noop"}]);
					}
				}

				transport.on("packet", onPacket);
			}
			this.clearTransport = function() {
				this.transport.on("error", function() {

				});
				clearTimeout(this.pingTimeoutTimer);
			}
			this.onClose = function(reason, description) {
				if("closed" != this.readyState) {
					clearTimeout(this.pingTimeoutTimer);
					clearInterval(this.checkIntervalTimer);
					this.checkIntervalTimer = null;
					clearTimeout(this.upgradeTimeoutTimer);
					var self = this;
					process.nextTick(function() {
						self.writeBuffer = [];
					});
					this.packetsFn = [];
					this.sentCallbackFn = [];
					this.clearTransport();
					this.readyState = "closed";
					this.emit("close", reason, description);
				}
			}
			this.setupSendCallback = function() {
				var self = this;
				this.transport.on("drain", function() {
					if( self.sentCallbackFn.length > 0) {
						var seqFn = self.sentCallbackFn.splice(0,1)[0];
						if(latte_lib.isFunction(seqFn)) {
							seqFn(self.transport);
						} else if(latte_lib.isArray(seqFn)) {
							for(var l = seqFn.length, i = 0; i < l; i++) {
								if(latte_lib.isFunction(seqFn[i])) {
									seqFn[i](self.transport);
								}
							}
						}
					}
				});
			}
			this.send = this.write = function(data, callback) {
				this.sendPacket("message", data, callback);
				return this;
			}
			this.sendPacket = function(type, data, callback) {
				if("closing" != this.readyState) {
					var packet = {type: type};
					if(data) packet.data = data;
					this.emit("packetCreate", packet);
					this.writeBuffer.push(packet);
					this.packetsFn.push(callback);
					this.flush();
				}
			}
			this.flush = function() {
				if("closed" != this.readyState && this.transport.writable
					&& this.writeBuffer.length) {
					this.emit("flush", this.writeBuffer);
					this.server.emit("flush", this, this.writeBuffer);
					var wbuf = this.writeBuffer;
					this.writeBuffer = [];
					if(!this.transport.supportsFraming) {
						this.sentCallbackFn.push(this.packetsFn);
					} else {
						this.sentCallbackFn.push.apply(this.sentCallbackFn, this.packetsFn);
					}
					this.packetsFn = [];
					this.transport.send(wbuf);
					this.emit("drain");
					this.server.emit("drain", this);
				}
			}
			this.getAvailableUpgrades = function() {
				var availableUpgrades = [];
				var allUpgrades = this.server.upgrades(this.transport.name);
				for(var i = 0, l = allUpgrades.length; i < l; ++i) {
					var upg = allUpgrades[i];
					if(this.server.transports.indexOf(upg) != -1) {
						availableUpgrades.push(upg);
					}
				}
				return availableUpgrades;
			}
			this.close = function() {
				if("open" == this.readyState) {
					this.readyState = "closing";
					var self = this;
					this.transport.close(function() {
						self.onClose("forced close");
					});
				}
			}
		}).call(Socket.prototype);
		module.exports = Socket;
	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });