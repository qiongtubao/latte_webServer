(function(define) { 'use strict';
	define("latte_webServer/session/store", ["require", "exports", "module", "window"], 
	function(require, exports, module, window) {		
		(function() {	
		var Session = require("./session")
			, latte_lib = require("latte_lib")
			, Redis = require("latte_db").redis;	
			//211.155.86.237
			
		var removeIdle = latte_lib.removeIdle;
			/*var pool = Redis.bindDb("server",{
				host:"192.168.1.7",
				port:6379,
				database:0
			}).server;*/
			function RedisStore(opts) {
				this.pool = opts.pool || Redis.create(opts);
				this.idleTimeoutMillis =  opts.idleTimeoutMillis/1000 || 60 * 60;
			};
			latte_lib.inherits(RedisStore,removeIdle);
			(function() {
				this.get = function(sid, fn) {
					this.pool.command(function(err, client, callback) {
						if(err) {
							callback(err);
							return fn(err);
						}
						client.get(sid, function(err, data) {
							callback(err);
							if(err) {
								return fn(err);
							}
							if(data) {
								data = JSON.parse(data);
							}
							fn(null, data);
						});

					});
				}
				this.set = function(sid, session, fn) {
					var sess = JSON.stringify(session);
					var ttl = this.idleTimeoutMillis;
					this.pool.command(function(err, client, callback) {
						if(err) {
							callback(err);
							return fn(err);
						}
						client.setex(sid, ttl, sess, function(err) {
							callback(err);
							fn && fn.apply(this, arguments);
						});
					});
				}
				this.createSession = function() {
					return new Session();
				}
			}).call(RedisStore.prototype);
			this.redisStore = RedisStore;
		}).call(module.exports);
		
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });