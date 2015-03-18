lgtv = require("../index");
/*---------------------------------------------------------------------------*/
var run_test = function() {
    lgtv.connect(function(err, response){
    if (!err) {
      lgtv.start_app("com.webos.app.livetv", function(err, response){
        if (!err) {
          lgtv.disconnect();
        }
      });
    }
  });
};

run_test();
