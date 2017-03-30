var XHR = require("./polling-xhr")
	, JSONP = require("./polling-jsonp");
module.exports = exports = {
	polling: polling,
	websocket: require("./websocket")
};
exports.polling.upgradesTo = ["websocket"];
function polling(ctx) {
	if("string" == typeof ctx.gets.j) {
		return new JSONP(ctx);
	} else {
		return new XHR(ctx);
	}
}