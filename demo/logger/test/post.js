var latte_xhr = require("latte_xhr");
describe("/", function() {
	it("xhr", function(done) {
		
		latte_xhr
			.post("127.0.0.1:8080")
			.set('Accept', 'application/json')
			.send({ name: 'Manny', species: 'cat', data: {a: 1} })
			.end(function(err, data) {
				if(err) {
					console.log("err:",err);
				}else{
					console.log("ok",data.text);
				}
				done(err);
			});
	});
});