(function(define) { "use strict";
	define("latte_web/engine", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, events = latte_lib.events
			, WebsocketServer = require("ws").Server
			, transports = require("./transports")
			, Socket = require("./socket");
		
			
			var Cluster = require("cluster");
			if(!Cluster.isMaster) {
				var Engine = function(path, opts) {
					if(!this instanceof Engine) {
						return new Engine(opts);
					}
					this.clients = {};
					this.clientsCount = 0;
					opts = opts || {};
					this.pingTimeout = opts.pingTimeout || 60000;
					this.pingInterval = opts.pingInterval || 25000;
					this.upgradeTimeout = opts.upgradeTimeout || 10000;
					this.maxHttpBufferSize = opts.maxHttpBufferSize || 10E7;
					this.transports = opts.transports || Object.keys(transports);
					this.allowUpgrades = false !== opts.allowUpgrades;
					this.allowRequest = opts.allowRequest;
					this.cookie = false !== opts.cookie ?(opts.cookie || "io"): false;
					if(~this.transports.indexOf("websocket")) {
						this.ws = new WebsocketServer({noServer: true, clientTracking: false});
					}
					this.path = path;
				};
				latte_lib.inherits(Engine, events);
				(function() {
					this.errors = {
						UNKNOWN_TRANSPORT: 0,
						UNKNOWN_SID: 1,
						BAD_HANDSHAKE_METHOD: 2,
						BAD_REQUEST: 3
					};
					this.errorMessages = {
						0: 'Transport unknown',
						1: 'Session ID unknown',
						2: 'Bad handshake method',
						3: 'Bad request'
					}
				}).call(Engine);
				(function() {
					this.handleUpgrade = function(req, socket, head) {
						var self = this;
						this.verify(req, true, function(err, success) {
							if(err) {
								socket.end();
								return;
							}
							self.ws.handleUpgrade(req, socket, head, function(conn) {
								self.onWebSocket(req, conn);
							});
						});
					}
					this.onWebSocket = function(req, socket) {

						if(!transports[req.gets.transport].prototype.handlesUpgrades) {
							socket.close();
							return;
						}
						var id = req.gets.sid;
						req.websocket = socket;
						if(id) {
							if(!this.clients[id]) {
								socket.close();
							} else if(this.clients[id].upgraded) {
								socket.close();
							} else {
								var transport = new transports[req.gets.transport](req);
								if(req.gets.b64) {
									transport.supportsBinary = false;
								}else{
									transport.supportsBinary = true;
								}
								this.clients[id].maybeUpgrade(transport);
							}
						} else {
							this.handshake(req.gets.transport, req);
						}
					}
					this.upgrades = function(transport) {
						if(!this.allowUpgrades) return [];
						return transports[transport].upgradesTo || [];
					}
						var utils = require("../utils");
					 	function sendErrorMessage(req, res, code) {
						    var headers = { 'Content-Type': 'application/json' };
						    utils.Origin(req, res);
						    /*if (req.headers.origin) {
						      headers['Access-Control-Allow-Credentials'] = 'true';
						      headers['Access-Control-Allow-Origin'] = req.headers.origin;
						    } else {
						      headers['Access-Control-Allow-Origin'] = '*';
						    }*/
						    res.writeHead(400, headers);
						    res.end(JSON.stringify({
						      code: code,
						      message: Engine.errorMessages[code]
						    }));
					 	}
					/**
					 * 会发送比如
					 * 1.
					 * /engine.io/?EIO=2&transport=polling&t=1426251747550-0
					 */
					//初始化	 
					this.handleRequest = function(req, res) {
						var self = this;
						req.res = res;		
						this.verify(req, false, function(err) {
							//console.log(req.method, err);
							if(err) {
								return sendErrorMessage(req, res, err);
							}
							
							if(req.gets.sid) {

								self.clients[req.gets.sid].transport.onRequest(req);
							}else{
								self.handshake(req.gets.transport, req);
							}
							
						});					
					}
					this.verify = function(req, upgrade, fn) {
						var transportName = req.gets.transport;
						
						if(!~this.transports.indexOf(transportName)) {
							return fn(Engine.errors.UNKNOWN_TRANSPORT);
						}

						var sid = req.gets.sid;
						
						if(sid) {
							if(!this.clients.hasOwnProperty(sid)) {
								return fn(Engine.errors.UNKNOWN_SID);
							}
							if(!upgrade && this.clients[sid].transport.name !== transportName) {
								return fn(Engine.errors.BAD_REQUEST);
							}
						} else {
							if("GET" != req.method ) return fn(Engine.errors.BAD_HANDSHAKE_METHOD);
							if(!this.allowRequest) return fn(null);
							return this.allowRequest(req, fn);
						}
						fn(null);
					}
						var randomId = function(num) {
							var str = Math.abs(Math.random() * Math.random() * Date.now() | 0).toString(32)
				     		 + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString(32)
							return str.slice(-num);
						}
					this.handshake = function(transportName, req) {
						var id = randomId(15);
						//base64id.generateId();
						try {
							var transport = new transports[transportName](req);
							if("polling" == transportName) {
								transport.maxHttpBufferSize = this.maxHttpBufferSize;
							}
							if( req.gets.b64 ) {
								transport.supportsBinary = false;
							} else {
								transport.supportsBinary = true;
							}
						}catch(e) {
							return sendErrorMessage(req, req.res, Engine.errors.BAD_REQUEST);
						}
						var socket = new Socket(id, this, transport, req);
						var self = this;
						if(false !== this.cookie) {
							transport.on("headers", function(headers) {
								headers["Set-Cookie"] = self.cookie + "=" + id;
							});
						}
						/*process.send({
							type: "bind",
							data: {
								address: req.socket.address()
							}
						});*/
						transport.onRequest(req);
						this.clients[id] = socket;
						this.clientsCount++;
						socket.once("close", function() {
							delete self.clients[id];
							self.clientsCount--;
						});
						this.emit("connection", socket);
					}


				}).call(Engine.prototype);
				module.exports = Engine;
			} else {
				var Engines = function() {
					this.all = {};
				};
				latte_lib.inherits(Engines, events);
				(function() {

				}).call(Engines.prototype);
				module.exports =  Engines;
			}
			

	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });