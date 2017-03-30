module.exports = function(ctx) {
	ctx.res.writeHead(404);
	ctx.send("not find");
};