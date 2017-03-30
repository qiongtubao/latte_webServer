var config = {
	port: 8080,
	rpc: {
		loadPath:"./rpc"
	},
	web: {
		loadPath: "./web"
	},
	cpus:1
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();