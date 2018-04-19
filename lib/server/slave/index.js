var Web = require("./web")
	, Ios = require("./io")
	, Static = require("./static")
	, Proxy = require("./proxy")
	, View = require("./view")
	, Proxy = require("./proxy")
	, Status = require("./status")
	, Rpc = require("./rpc")
	, Ctx = require("./ctx")
	, latte_verify = require("latte_verify")
	, Logger = require("./logger")
	, latte_lib = require("latte_lib")
	, Web = require("./web")
	, Domain = require("domain");


var verifyConfig = {
	type: "object",
	properties: {
		port: {
			type: "integer",
			default: 80
		},
		type: {
			type: "string",
			enum: ["http", "https"],
			default: "http",
			error: function(err) {
				console.error("config type error");
			}
		},
		nginx: {
			type: "boolean",
			default: false
		},
		timeout: {
			type: "integer",
			default: 3000
		}
	},
	default: {

	}
};
var basicServer = require("../utils/server");
var Server = function(config) {
	var self = this;
	//配置
	this.config = latte_verify.verify(config, verifyConfig);
	
	//日志
	this.logger = new Logger(this.config.logger, self);
	//类型
	this.type = "slave";
	//初始化状态
	this.status = new Status(this.config.status, self);
	//初始化模块
	this.init();
	//创建和主进程通讯的rpc
	this.rpc = new Rpc(this.config.rpc, this);
	this.rpc.on("error", function(err) {
		self.logger.serverError(err);
	});
};
latte_lib.extends(Server, basicServer);
(function() {
	/**
		@method run
		启动服务器
	*/
	this.run = function() {
		var self = this
			, serverDomain = Domain.create();
		serverDomain.on("error", function(err) {
			self.logger.serverError(err);
		});
		serverDomain.run(function() {
			var protocol = require(self.config.type);
			var server = self.server = protocol.createServer(function(req, res) {
				var reqd = Domain.create();
				var ctx= new Ctx(req, res, self);
				reqd.on("error", function(err) {
					console.log(err);
					self.emit("webError", err, ctx);
				});
				reqd.add(req);
				reqd.add(res);
				reqd.run(function() {
					self.onRequest(ctx);
				});
			});
			//设置超时时间
			server.timeout = self.config.timeout;
			//协议升级
			server.on("upgrade", function(req, socket, head) {
				//var latte = { req: req, res: res };
				self.onUpgrade(req, socket, head);
			});
			//绑定端口
			server.listen(self.config.port, function() {
				latte_lib.debug.info(self.config.port, "server start");
			});
		});
		
	}
	this.onRequest = function(ctx) {
		var self = this;
		this.status.addCtx(ctx);
		var fns = [
			self.ios.request.bind(this.ios),
			self.web.request.bind(this.web),
			self.staticWeb.request.bind(this.staticWeb),
			self.proxyWeb.request.bind(this.proxyWeb),
			self.view.getStatus(404).bind(this.view)
		].map(function(fn) {
			return function(callback) {
				fn(ctx, callback);
			}
		});
		latte_lib.async.series(fns);
	}
	/**
		协议升级的情况
	*/
	this.onUpgrade = function(req, socket, head) {
		var ctx = new Ctx(req, null, this);
		this.ios.handleUpgrade(ctx, socket, head);
	}
	/**
		@method init
		初始化模块
		 优先级
		 io > web > static > proxy

	*/
	this.init = function() {
		var self = this
		//设置错误
		this.on("error", this.onError.bind(this));
		this.view = new View(this.config.view, this);
		this.web = new Web(this.config.web, this);
		this.web.on("error", function(err, latte) {
			self.emit("webError", err, latte);
			self.logger.webError(err, latte);
		});
		//创建Io管理对象
		this.ios = new Ios(this.config.io, this);
		this.ios.on("error", function(err) {
			self.logger.ioError(err);
		});
		//静态web服务器
		this.staticWeb = new Static(this.config.staticWeb, this);
		this.staticWeb.on("error", function(err, latte) {
			self.emit("webError", err, latte);
			self.logger.staticWebError(err, latte);
		});
		//代理服务器
		this.proxyWeb = new Proxy(this.config.proxy, this);
		this.proxyWeb.on("error", function(err, latte) {
			self.emit("webError", err, latte);
			self.logger.proxyWebError(err, latte);
		});
	}
	this.onError = function(err, latte) {

		if(latte && !latte.sended()) {
			latte.send(err);
		}
	}
	this.addView = function() {
		this.view.add(name, func);
	}
	
	this.doSlave = function(func) {
		func();
	}
}).call(Server.prototype);
module.exports = Server;