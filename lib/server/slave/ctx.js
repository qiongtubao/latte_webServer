/**
	可发送事件
*/
var latte_lib = require("latte_lib");
var Querystring = require("querystring");
var Url = require("url");
var Ctx = function(req, res, server) {
 	this.req = req;
 	this.res = res;
 	this.server = server;
 	
 	this.initReq();
 	this.initRes();
	this.initServer();
};
latte_lib.extends(Ctx, latte_lib.events);
(function() {
	this.initReq = function() {
		if(!this.req) {
			return;
		}
		var url = Url.parse(this.req.url);
		this.pathname = decodeURIComponent(url.pathname);
	 	this.gets = Querystring.parse(url.query);
	}
	this.initRes = function() {		
		if(!this.res) {
			return;
		}
		var _send = this.res.end;
		var sended = 0;
		this.sended = function() {
			return sended;
		}
		var self = this;
		this.send = function(data) {
			//sended = 1;
			if(sended) {
				latte_lib.debug.error("res sended ");
				return;
			}
			sended = 1;
			self.emit("end");
			var args = Array.prototype.slice.call(arguments, 0);
			self._send.apply(self, args); 
		}

	}
	this.initServer = function() {
		if(!this.server) {
			return ;
		}
		var self = this;
		this.view = function(type) {
			var args = Array.prototype.slice.call(arguments, 1);
			args.push(self);
			//console.log(self.server.view);
			self.server.view.getView(type).apply(self.server.view, args);
		}
	}
	this.write = function(data) {
		return this.res.write(data);
	}
	this._send = function(data) {
		var res = this.res;
		if(data == null){
			res.end();
		}else if(latte_lib.isString(data)) {
			res.end(data);
		}else if(data.pipe) {
			data.pipe(res);
		}else if(data.constructor == Buffer) {
			res.end(data.toString());
		}else if(data.stack) {
			res.end(data.stack);
		}else{
			res.end(JSON.stringify(data));
		}
	}
	this.set = function(key, value) {
		this.res.setHeader(key, value);
	}

}).call(Ctx.prototype);
module.exports = Ctx;