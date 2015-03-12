var Server = require("../../../index");
var server = new Server({
	cpus: 2
});
var i = 0;
var encode = encodeURIComponent;
var decode = decodeURIComponent;

server.use(Server.Cookie);
server.get("/setCookie", function(req,res) {
	req.cookies.add({name: "a", value: 1, maxAge: 60*1000});
	res.send("1");
});
server.get("/removeCookie", function(req, res) {
	req.cookies.remove("a");
	res.send("1");
});
server.get("/getCookie", function(req, res) {
	console.log(req.cookies.get("a"));
	res.send("1");
});
server.on("update", function(data) {
	console.log("updating:",process.pid, data);
});
server.run();