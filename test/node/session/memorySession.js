var Server = require("../../../index");
var server = new Server({
	cpus: 1
});
var i = 0;
server.use(Server.Cookie);
server.use(Server.Session({timeout: 1000 * 60}));
server.get("/setSession", function(req, res) {
	req.session.data = 100;
	res.send(1);
});
server.get("/getSession", function(req, res) {
	console.log(req.session.data);
	res.send(req.session.data||"");
});
server.get("/delSession", function(req, res) {
	console.log(req.cookies.get("latte.sid"));
	req.sessionStore.del(req.cookies.get("latte.sid"));
	throw new Error("test");
});
server.on("update", function(data) {
	console.log("updating:",process.pid, data);
});
server.run();