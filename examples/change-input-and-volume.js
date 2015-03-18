lgtv = require("../index");
/*---------------------------------------------------------------------------*/
var run_test = function() {
    lgtv.connect(function(err, response){
    if (!err) {
      lgtv.set_input("HDMI_1", function(err, response){
        if (!err) {
          lgtv.set_volume(15, function(err, response){
            lgtv.disconnect();
          });
        }
      });
    }
  });
};

run_test();
