/**
	现在有统计连接个数
*/
var Status = function(config) {
	this.httpCount = 0;
};
(function() {
	this.addCtx = function(ctx) {
		this.httpCount ++;
		var self = this;
		ctx.once("end", function() {
			self.httpCount--;
		});
	}
}).call(Status.prototype);
module.exports = Status;