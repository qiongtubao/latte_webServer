var Post = require("latte_web_post");
module.exports = {
	before: function(ctx, next) {
		if(ctx.config && ctx.config.post) {
			var config = ctx.config.post.config || {};
			var post = new Post(config);
			post.parse(ctx.req, function(err, data) {
				if(err) {
					ctx.send(ctx.config.post.error);
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
