var latte_lib = require("latte_lib");

		var parser = require('./parser.js')
		  ,debug = latte_lib.debug.info;



		module.exports = Transport;
		function noop () {};

		function Transport (ctx) {
		  this.readyState = 'opening';
		};
		latte_lib.inherits(Transport, latte_lib.events);
		(function() {
			this.onRequest = function(ctx) {
				debug('setting request');
		  		this.req = ctx.req;
			}
			this.close = function(fn) {
				this.readyState = 'closing';
		  		this.doClose(fn || noop);
			}
			this.onError = function (msg, desc) {
			  if (this.listeners('error').length) {
			    var err = new Error(msg);
			    err.type = 'TransportError';
			    err.description = desc;
			    this.emit('error', err);
			  } else {
			    debug('ignored transport error %s (%s)', msg, desc);
			  }
			};

			this.onPacket = function (packet) {
			  this.emit('packet', packet);
			};
			this.onData = function (data) {
				
			  this.onPacket(parser.decodePacket(data));
			};
			this.onClose = function () {
			  this.readyState = 'closed';
			  this.emit('close');
			};
		}).call(Transport.prototype);