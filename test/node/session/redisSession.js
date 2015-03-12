var Server = require("../../../index");
var server = new Server({
	cpus: 2
});
var i = 0;
server.use(Server.Cookie);
var latte_db = require("latte_db");
latte_db.redis.bindDb("test", {
	host: "192.168.1.25",
	port: 6379,
	database: 10,
	maxPoolNum: 20,
	minPoolNum: 1,
	idleTimeoutMillis: 3000
});

var redisStore =  Server.Session.createRedisStore({pool: latte_db.redis.test});
server.use(Server.Session({timeout: 1000 * 60, store: redisStore}));
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
	req.sessionStore.del(req.cookies.get("latte.sid"), function() {
		throw new Error("test");
	});
	
});
server.on("update", function(data) {
	console.log("updating:",process.pid, data);
});
server.run();