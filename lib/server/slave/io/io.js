var Rpc = require("./rpc");
var latte_verify = require("latte_verify");
var transports = require("./transports")
	, WebsocketServer = require("ws").Server
	, Rpc = require("./rpc")
	,  Socket = require("./socket")
	, latte_lib = require("latte_lib");
var verifyConfig = {
	type: "object",
	properties: {
		transports: {
			type: "array",
			in: Object.keys(transports),
			default: Object.keys(transports)
		},
		allowUpgrades: {
			type: "boolean",
			default: true
		},
		pingTimeout: {
			type: "interge",
			default: 60000
		},
		pingInterval: {
			type: "interge",
			default: 25000
		},
		upgradeTimeout: {
			type: "interge",
			default: 10000
		}
	}
}
var Io = function(path, option) {
	this.path = path;
	this.clients = {};
	this.clientsCount = 0;
	this.config = latte_verify.verify(option, verifyConfig);
	if(~this.config.transports.indexOf("websocket")) {
		this.ws = new WebsocketServer({noServer: true, clientTracking: false});
	}
	this.rpc = new Rpc(this.config, this);
	
};
latte_lib.extends(Io, latte_lib.events);
(function() {
	this.errors = {
		UNKNOWN_TRANSPORT: 0,
		UNKNOWN_SID: 1,
		BAD_HANDSHAKE_METHOD: 2,
		BAD_REQUEST: 3,
		AUTH_FAILED: 4
	};
	this.errorMessages = {
		0: 'Transport unknown',
		1: 'Session ID unknown',
		2: 'Bad handshake method',
		3: 'Bad request',
		4: 'Auth failed'
	}
}).call(Io);
(function() {
	this.handleUpgrade = function(ctx, socket, head) {
		var self = this;
		this.verify(ctx, true , function(err, success) {
			if(err) {
				socket.end();
				return;
			}
			self.ws.handleUpgrade(ctx.req, socket, head, function(conn) {
				self.onWebSocket(ctx, conn);
			});
		});
	}
	this.onWebSocket = function(ctx, socket) {
		
		if(!transports[ctx.gets.transport].prototype.handlesUpgrades) {

			socket.close();
			return;
		}
		var id = ctx.gets.sid;

		ctx.websocket = socket;
		if(id) {
			if(!this.clients[id]) {
				socket.close();
			} else if(this.clients[id].upgraded) {
				socket.close();
			} else {
				var transport = new transports[ctx.gets.transport](ctx);
				if(ctx.gets.b64) {
					transport.supportsBinary = false;
				}else{
					transport.supportsBinary = true;
				}
				this.clients[id].maybeUpgrade(transport);
			}
		} else {
			this.handshake(ctx.gets.transport, ctx);
		}

	}
	this.upgrades = function(transport) {
		if(!this.config.allowUpgrades) return [];
		return transports[transport].upgradesTo || [];
	}
	var utils = require("../../utils");
 	function sendErrorMessage(ctx, code) {
 		var headers = { "Content-Type": "application/json"}; 
 		if(ctx.res) {
 			utils.Origin(ctx);
 			ctx.res.writeHead(400, headers);
		    ctx.send(JSON.stringify({
		      code: code,
		      message: Io.errorMessages[code]
		    }));
 		}else{
 			var parser = require("./parser");
	    	parser.encodePacket({
		      type: "message",
		      data: JSON.stringify({
			      code: code,
			      message: Io.errorMessages[code]
	    		})
		    },0, function(data) {
	    		ctx.websocket.send(data);
	    		ctx.websocket.close();
	    	});
 		}
 	}

 	this.handleRequest = function(ctx) {
 		var self = this;
		try {
			this.verify(ctx, false, function(err) {
				//console.log(req.method, err);
				try {
					if(err) {
						return sendErrorMessage(ctx, err);
					}
					if(ctx.gets.sid) {
						self.clients[ctx.gets.sid].transport.onRequest(ctx);
					}else{
						self.handshake(ctx.gets.transport, ctx);
					}
				}catch(e) {
					console.log(e);
				}
				

			});
		}catch(e) {
			console.log(e);
		}
 	}

 	this.verify = function(ctx, upgrade, fn) {
		var transportName = ctx.gets.transport;

		if(!~this.config.transports.indexOf(transportName)) {
			return fn(Io.errors.UNKNOWN_TRANSPORT);
		}

		var sid = ctx.gets.sid;

		if(sid) {
			if(!this.clients.hasOwnProperty(sid)) {
				return fn(Io.errors.UNKNOWN_SID);
			}
			if(!upgrade && this.clients[sid].transport.name !== transportName) {
				return fn(Io.errors.BAD_REQUEST);
			}
		} else {
			if("GET" != ctx.req.method ) return fn(Io.errors.BAD_HANDSHAKE_METHOD);
			//if(this.auth && !this.auth(req)) { return fn(Io.errors.AUTH_FAILED); }
			if(!this.allowRequest) return fn(null);
			return this.allowRequest(ctx.req, fn);
		}
		fn(null);
	}
		var randomId = function(num) {
			var str = Math.abs(Math.random() * Math.random() * Date.now() | 0).toString(32)
     		 + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString(32)
			return str.slice(-num);
		}
	this.handshake = function(transportName, ctx) {
		var self = this;
		var id ;
		var doIt = function(id) {
			try {
				var transport = new transports[transportName](ctx);
				if("polling" == transportName) {
						transport.maxHttpBufferSize = self.maxHttpBufferSize;
				}
				if( ctx.gets.b64 ) {
					transport.supportsBinary = false;
				} else {
					transport.supportsBinary = true;
				}
			}catch(e) {
				return sendErrorMessage(ctx, Io.errors.BAD_REQUEST);
			}
			var socket = new Socket(id, self, transport, ctx.req);
			if(false !== self.cookie) {
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
			transport.onRequest(ctx);
			self.clients[id] = socket;
			self.clientsCount++;
			socket.once("close", function(e) {
				console.log(e);
				if(self.clients[id] == socket) {
					delete self.clients[id];
					self.clientsCount--;
				}
			});
			self.rpc.addSocket(socket);
			self.emit("connection", socket);
		};
		if(self.authSync) {
			id = self.authSync(req);
			if(id === false || id== undefined) { return sendErrorMessage(req, req.res, Io.errors.AUTH_FAILED); }
			if(id === true) {
				id = randomId(15);
			};
			doIt(id);
		}else if(self.auth) {
				self.auth(req, function(err, id){
						if(err) {
							return sendErrorMessage(req, req.res, Io.errors.AUTH_FAILED);
						}
						if(id === null) {
								id = randomId(15);
						};
						doIt(id);
				});
		}else{
			id = randomId(15);
			doIt(id);
		}
		//base64id.generateId();

	}
}).call(Io.prototype);
module.exports = Io;