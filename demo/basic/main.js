
var config = {
	port: 8080,
	web: {
		loadPath: "web"
	}
};
var Server = require("../../index.js");
var server = new Server(config);
process.latte = server;
server.run();