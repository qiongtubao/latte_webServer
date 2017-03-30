module.exports = {
	before: function(ctx, next) {
		if(ctx.config && ctx.config.logger) {
			ctx.logger = {
				startTime: Date.now()
			};
		}
		
		next();
	},
	after: function(ctx, next) {
		ctx.logger && console.log("hello",Date.now() - ctx.logger.startTime);
		next();
	}
};