lgtv = require("lgtv");
/*---------------------------------------------------------------------------*/
var run_test = function() {
  lgtv.connect(function(err, response){
    if (!err) {
      lgtv.show_float("It works!", function(err, response){
        if (!err) {
          lgtv.disconnect();
        }
      }); // show float
    }
  }); // connect
}; // run test

run_test();
