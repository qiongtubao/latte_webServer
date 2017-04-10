var latte_lib = require("latte_lib");
    var latteRequire = require("latte_require");
    var defaultConfig = {};
    var superClass = require("latte_load")
    latte_verify = require("latte_verify");
    var verifyConfig = {
      type: "object",
      properties: {
       
      },
      default: {
        
      }
    };  
    
    function Rpc(config) {
      if(latte_lib.isString(config)) {
        config = {
          loadPath: config
        }
      }
      this.clean();
      superClass.call(this, config);
      this.config = latte_verify.verify(this.config, verifyConfig);
      
      

     
  
     
    };
    latte_lib.extends(Rpc, superClass);
    (function() {
			this.clean = function() {
        superClass.prototype.clean.call(this);
        this.methods = {};
        this.id = 0;
      }
      this.load = function(path, o) {
        var self = this;
        if(o.method) {
          self.SetMethod(o.method, o.handle);
        }
      }
      
      this.SetMethod = function(method, fn) {

        this.methods[method] = fn;
      }
        var backData = function(err, result, id) {
          return {
            error: err,
            result: result,
            id: id
          };
        };
      this.addSocket = function(socket) {
        var self = this;
        socket.Call = function(method, params, callback) {
          socket.send(JSON.stringify({
            method: method,
            params: params,
            id: ++self.id
          }));
          callback && self.once(self.id, callback.bind(socket));
        }
        socket.on("message", function(data) {
          try {
              data = JSON.parse(data);
			  //console.log(data, self.methods);
          }catch(e) {

              return;
          }

          if(data.method) {
            var method = self.methods[data.method];
            if(method) {
              if(!latte_lib.isArray(data.params)) {
                data.params = [].concat(data.params);
              }
              data.params.push(function(err, result) {
               // console.log(err, result);
								socket.send(JSON.stringify(backData(err, result, data.id)))
							});
							try {
								method.apply(socket, data.params);
							}catch(e) {
								latte_lib.debug.error(socket, e);
							}

            }
          }else if(data.id) {
            socket.emit(data.id, data.error, data.result);
          }
        });
      }
    }).call(Rpc.prototype);
    module.exports = Rpc;