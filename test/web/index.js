var Server = require("../../index");
var server = new Server({
	cpus: 2,
	proxys: {
		"latte_lib": "../../../latte_lib/test/web/"
	},
	proxyUrl: "http://192.168.1.25:10096/"
});
var i = 0;
server.post("/octetStream", function(req,res) {
	console.log(req.posts);
	req.posts._files.forEach(function(file) {
		file.del();
	});
	res.send("1");
});
server.get("/octetStream", function(req, res) {
	console.log(req.gets);
	res.send("2");
});
server.on("update", function(data) {
	console.log("updating:",process.pid, data);
});
server.run();