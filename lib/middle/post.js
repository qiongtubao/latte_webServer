var Post = require("latte_web_post");
module.exports = {
	before: function(ctx, next) {
		if(ctx.req.method.toLowerCase() == "post") {
			var config = (ctx.config.post ? ctx.config.post.config || {} : {});
			var post = new Post(config);
			post.parse(ctx.req, function(err, data) {
				if(err) {
					if(ctx.config.post && ctx.config.post.error) {
						ctx.send(ctx.config.post.error);
					}else{
						ctx.send(err);
					}
					
					//console.log(err);
					return;
				}
				ctx.posts  = data || {};
				next();
			});
		}else{
			next();
		}
	}
};
