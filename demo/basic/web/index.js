(function() {
	this.get = function(ctx, next) {
		ctx.send("hello,word");
	}
	this.path = "/";
}).call(module.exports);