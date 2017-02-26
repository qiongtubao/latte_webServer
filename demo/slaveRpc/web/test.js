(function() {
	process.num = 0;
	this.get = function(ctx, next) {
		process.num++;
		process.latte.rpc.Call("test", [], function(err, data) {
			ctx.view(
				"json",{
				err: err,
				data: data
			});
		});
	}
	this.path = "/test"
}).call(module.exports);