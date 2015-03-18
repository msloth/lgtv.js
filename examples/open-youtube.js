lgtv = require("lgtv");
/*---------------------------------------------------------------------------*/
var run_test = function() {
    lgtv.connect(function(err, response){
    if (!err) {
      lgtv.start_app("youtube.leanback.v4", function(err, response){
        if (!err) {
          lgtv.disconnect();
        }
      });
    }
  });
};

run_test();
