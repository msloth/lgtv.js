lgtv = require("lgtv");
/*---------------------------------------------------------------------------*/
var run_test = function() {
    lgtv.connect(function(err, response){
    if (!err) {
      lgtv.open_browser_at("http://github.com/msloth", function(err, response){
        if (!err) {
          lgtv.disconnect();
        }
      });
    }
  });
};

run_test();
