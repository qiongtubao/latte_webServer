(function() {
	this.config = {
		get: {
			logger: false
		},
		post: {
			post: true
		}
	};
	this.get = function(ctx, next) {
		
	}
	this.post = function(ctx, next) {
		
		var num = 0;
		var a = function() {
			if(++num == 25) {
				ctx.send("ok");
			}
			//num++;
			ctx.res.write("num");
			setTimeout(a, 1000)
		};
		a();
		
	
	}
	this.path = "/";
}).call(module.exports);