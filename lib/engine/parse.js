(function(define) { "use strict";
	define("latte_web/engine/parse", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, utf8 = latte_lib.utf8;
		var noop = function() {};
		var after = function(count, callback, err_cb) {
			var bail = false;
			err_cb = err_cb || noop;
			proxy.count = count;
			return (count === 0) ? callback() : proxy;
			function proxy(err, result) {
				if(proxy.count <= 0) {
					throw new Error("after called too many times");
				}
				--proxy.count;
				if(err) {
					bail = true;
					callback(err)
					callback = err_cb
				} else if(proxy.count === 0 && !bail) {
					callback(null, result);
				}
			}
		};
		(function() {
			var _self = this;
			
			this.protocol = 3;
			var packets = this.packets = {
				open: 0
				, close   : 1
				, ping    : 2
				, pong    : 3
				, message : 4
				, upgrade : 5
				, noop    : 6
			};
			var packetslist = Object.keys(packets);

			var err = {type: "error", data: "parser error"};

			this.encodePacket = function(packet, supportsBinary, callback) {
				if(latte_lib.isFunction(supportsBinary)) {
					callback = supportsBinary;
					supportsBinary = null;
				}
				var data = (packet.data === undefined) 
					? undefined
					: packet.data.buffer || packet.data;
				if(Buffer.isBuffer(data)) {
					return encodeBuffer(packet, supportsBinary, callback);
				} else if(data instanceof ArrayBuffer) {
					return encodeArrayBuffer(packet, supportsBinary, callback);
				}
				var encoded = packets[packet.type];
				if( undefined !== packet.data) {
					encoded += utf8.encode(String(packet.data));
				}
				return callback("" + encoded);

			}

			this.encodeBuffer = function(packet, supportsBinary, callback) {
				var data = packet.data;
				if(!supportsBinary) {
					return _self.encodeBase64Packet(packet, callback);
				}
				var typeBuffer = new Buffer(1);
				typeBuffer[0] = packets[packet.type];
				return callback(Buffer.concat([typeBuffer, data]));
			}

			this.encodeArrayBuffer = function(packet, supportsBinary, callback) {
				var data = (packet.data === undefined) 
					? undefined : 
					packet.data.buffer || packet.data;
				if(!supportsBinary) {
					return _self.encodeBase64Packet(packet, callback);
				}
				var contentArray = new Uint8Array(data);
				var resultBuffer = new Buffer(1 + data.byteLength);
				resultBuffer[0] = packets[packet.type];
				for(var i = 0; i < contentArray.length; i++) {
					resultBuffer[i+1] = contentArray[i];
				}
				return callback(resultBuffer);
			}

			this.encodeBase64Packet = function(packet, callback) {
				var data = packet.data.buffer || packet.data;
				if(data instanceof ArrayBuffer) {
					var buf = new Buffer(data.byteLength);
					for(var i = 0; i < buf.length; i++) {
						buf[i] = data[i];
					}
					packet.data = buf;
				}
				var message = "b" + packets[packet.type];
				message  += packet.data.toString("base64");
				return callback(message);
			};

			this.decodePacket = function(data, binaryType) {
				if(latte_lib.isString(data) || data == undefined) {
					if(data.charAt(0) == "b") {
						return _self.decodeBase64Packet(data.substr(1), binaryType);
					}
					var type = data.charAt(0);
					data = utf8.decode(data);
					if(Number(type) != type || !packetslist[type]) {
						return err;
					}
					if(data.length > 1) {
						return { type: packetslist[type], data: data.substring(1) }
					} else {
						return { type: packetslist[type] };
					}
				}
				if(binaryType === "arraybuffer") {
					var type = data[0];
					var intArray = new Uint8Array(data.length - 1);
					for(var i = 1; i < data.length; i++) {
						intArray[i - 1] = data[i];
					}
					return {type: packetslist[type], data: intArray.buffer};
				}
				var type = data[0];
				return { type: packetslist[type], data: data.slice(1) };
			};

			this.decodeBase64Packet = function(msg, binaryType) {
				var type = packetslist[msg.charAt(0)];
				var data = new Buffer(msg.substr(1), "base64");
				if(binaryType === "arraybuffer") {
					var abv = new Uint8Array(data.length);
					for(var i = 0; i < abv.length; i++) {
						abv[i] = data[i];
					}
					data = abv.buffer;
				}
				return {type: type, data: data};
			} 

			this.encodePayload = function(packets, supportsBinary, callback) {
				if(latte_lib.isFunction(supportsBinary)) {
					callback = supportsBinary;
					supportsBinary = null;
				}
				if(supportsBinary) {
					return _self.encodePayloadAsBinary(packets, callback);
				}
				if(!packets.length) {
					return callback("0:");
				}
				function setLengthHeader(message) {
					return message.length + ":" + message;
				}
				function encodeOne(packet, doneCallback) {
					_self.encodePacket(packet, supportsBinary, function(message) {
						doneCallback(null, setLengthHeader(message));
					});
				}
				map(packets, encodeOne, function(err, results) {
					return callback(results.join(""));
				});
			}
				function map(ary, each, done) {
					var result = new Array(ary.length);
					var next = after(ary.length, done);
					var eacheWithIndex = function(i, el, cb) {
						each(el, function(error, msg) {
							result[i] = msg;
							cb(error, result);
						});
					};
					for(var i = 0; i < ary.length; i++) {
						eacheWithIndex(i, ary[i], next);
					}
				}

			this.decodePayload = function(data, binaryType, callback) {
				if(!latte_lib.isString(data)) {
					return _self.decodePayloadAsBinary(data, binaryType, callback);
				}
				if(latte_lib.isFunction(binaryType)) {
					callback = binaryType;
					binaryType = null;
				}
				var packet;
				if(data == "") {
					return callback(err, 0, 1);
				}
				var length = ""
					, n, msg;
				for(var i = 0, l = data.length; i < l ; i++) {
					var chr = data.charAt(i);
					if(":" != chr) {
						length += chr;
					} else {
						if("" == length || (length != (n = Number(length)))) {
							return callback(err, 0, 1);
						}
						msg = data.substr(i + 1, n);
						if(length != msg.length) {
							return callback(err, 0, 1);
						}
						if(msg.length) {
							packet = _self.decodePacket(msg, binaryType);
							if(err.type == packet.type && err.data == packet.data) {
								return callback(err, 0, 1);
							}
							var ret = callback(packet , i + n, l);
							if(false === ret) return;
						}
						i += n;
						length = "";
					}

				}
				if(length != "") {
					return callback(err, 0, 1);
				}
			};
				function bufferToString(buffer) {
					var str = '';
					for (var i = 0; i < buffer.length; i++) {
						str += String.fromCharCode(buffer[i]);
					}
					return str;
				}
				function stringToBuffer(string) {
					var buf = new Buffer(string.length);
					for (var i = 0; i < string.length; i++) {
						buf.writeUInt8(string.charCodeAt(i), i);
					}
					return buf;
				}
			this.encodePayloadAsBinary = function(packets, callback) {
				if(!packets.length) {
					return callback(new Buffer(0));
				}
				function encodeOne(p, doneCallback) {
					_self.encodePacket(p, true, function(packet) {
						if(latte_lib.isString(packet)) {
							var encodingLength = "" + packet.length;
							var sizeBuffer = new Buffer(encodingLength.length + 2);
							sizeBuffer[0] = 0;
							for(var i = 0; i < encodingLength.length; i++) {
								sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
							}
							sizeBuffer[sizeBuffer.length - 1] = 255;
							return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
						}
						var encodingLength = "" + packet.length;
						var sizeBuffer = new Buffer(encodingLength.length + 2);
						sizeBuffer[0] = 1;
						for(var i = 0; i < encodingLength.length; i++) {
							sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
						}
						sizeBuffer[sizeBuffer.length - 1] = 255;
						doneCallback(null, Buffer.concat([sizeBuffer, packet]));
					});
				}
				map(packets, encodeOne, function(err, results) {
					return callback(Buffer.concat(results));
				});
			}

			this.decodePayloadAsBinary = function(data, binaryType, callback) {
				if(latte_lib.isFunction(binaryType)) {
					callback = binaryType;
					binaryType = null;
				}
				var bufferTail = data;
				var buffers = [];
				while(bufferTail.length > 0) {
					var strLen = "";
					var isString = bufferTail[0] === 0;
					for(var i = 1; ; i++) {
						if(bufferTail[i] == 255) break;
						strLen += "" + bufferTail[i];
					}
					bufferTail = bufferTail.slice(strLen.length + 1);
					var msgLength = parseInt(strLen, 10);
					var msg = bufferTail.slice(1, msgLength + 1);
					if(isString) msg = bufferToString(msg);
					buffers.push(msg);
					bufferTail = bufferTail.slice(msgLength + 1);
				}
				var total = buffers.length;
				buffers.forEach(function(buffer, i) {
					callback(_self.decodePacket(buffer, binaryType), i , total);
				});
			}

		}).call(module.exports);
	});
})(typeof define === "function" ? define : function(name, reqs, factory){factory(require, exports, module); });