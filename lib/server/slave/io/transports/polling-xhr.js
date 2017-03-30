var Polling = require("./polling")
	, latte_lib = require("latte_lib");
module.exports = XHR;
function XHR(ctx) {
	Polling.call(this, ctx);
};
latte_lib.inherits(XHR, Polling);
(function() {
	this.onRequest = function(ctx) {
		if("OPTIONS" == ctx.req.method) {
			var res = ctx.res;
			var headers = this.headers(ctx.req);
			headers["Access-Control-Allow-Headers"] = "Content-Type";
			res.writeHead(200, headers);
			res.end();
		} else {
			Polling.prototype.onRequest.call(this, ctx);
		}
	}
	this.doWrite = function(data) {
		var isString = typeof data == 'string';
		var contentType = isString
			? 'text/plain; charset=UTF-8'
			: 'application/octet-stream';
		var contentLength = '' + (isString ? Buffer.byteLength(data) : data.length);

		var headers = {
			'Content-Type': contentType,
			'Content-Length': contentLength
		};

		// prevent XSS warnings on IE
		// https://github.com/LearnBoost/socket.io/pull/1333
		var ua = this.req.headers['user-agent'];
		if (ua && (~ua.indexOf(';MSIE') || ~ua.indexOf('Trident/'))) {
			headers['X-XSS-Protection'] = '0';
		}

		this.res.writeHead(200, this.headers(this.req, headers));
		this.res.end(data);
	}
	this.headers = function(req, headers) {
		headers = headers || {};

		if (req.headers.origin) {
			headers['Access-Control-Allow-Credentials'] = 'true';
			headers['Access-Control-Allow-Origin'] = req.headers.origin;
		} else {
			headers['Access-Control-Allow-Origin'] = '*';
		}

		this.emit('headers', headers);
		return headers;
	}
}).call(XHR.prototype);