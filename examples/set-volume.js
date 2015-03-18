lgtv = require("lgtv");
/*---------------------------------------------------------------------------*/
var args = process.argv.slice(2);
var vol = 10;
if (args.length > 0) {
  try {
    vol = parseInt(args[0]);
  } catch(error) {
  }
}

console.log("setting volume to:" + vol);

var run_test = function() {
  lgtv.connect(function(err, response){
    if (!err) {
      lgtv.set_volume(vol, function(err, response){
        lgtv.disconnect();
      }); // show float
    }
  }); // connect
}; // run test

run_test();
