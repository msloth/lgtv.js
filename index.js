// 
// LG webos smart TV control app
// references:
//    https://github.com/ConnectSDK/Connect-SDK-Android-Core
//    https://github.com/CODeRUS/harbour-lgremote-webos
// 
// 1: send handshake per below -> receive client key if not already
// 2: the protocol is using JSON strings with requests from the client, responses
//    from the TV. Subscriptions probably means the TV will push notifications 
//    without prior individual requests.
// 3: client request has these fields:
//        type : register/request/subscribe
//        id   : command + _ + message count (the response will mirror this number)
//        uri  : command endpoint URI
//        payload  : optional, eg input source string when changing input
// 
// All callbacks follow the common pattern of function(error, ....) {}
// ie first argument is false if the call went ok, or true if an error occurred.
// Then, the second argument is most often the result if applicable, or not
// existant respectively.
// -----------------------------------------------------------------------------
var fs = require('fs'); // for storing client key
// var http = require('http'); // for communication with Kodi

// var WebSocket = require('ws'); 
var WebSocketClient = require('websocket').client; // for communication with TV
var client = new WebSocketClient();
var handshaken = false;

// for SSDP discover of TV on the LAN
var dgram = require('dgram');

var eventemitter = new (require('events').EventEmitter); // for match ws request -- response
eventemitter.setMaxListeners(0); // enable infinite number of listeners

// connection to TV
var wsurl = 'ws://lgsmarttv.lan:3000';

// once connected, store client key (retrieved from TV) in this file
var client_key_filename = "./client-key.txt";

// bool for callbacks
var RESULT_ERROR = true;
var RESULT_OK = false;
// -----------------------------------------------------------------------------
// send this ask for permission to control the TV
// alternatives: pairingType = PROMPT or PIN
// PROMPT is arguably more convenient as it opens a yes/no dialog on the TV while
// PIN show a three-digit random number that has to be communicated to this app.

// this works and gives full auth
// handshake without client key, for first connection
var hello = "{\"type\":\"register\",\"id\":\"register_0\",\"payload\":{\"forcePairing\":false,\"pairingType\":\"PROMPT\",\"manifest\":{\"manifestVersion\":1,\"appVersion\":\"1.1\",\"signed\":{\"created\":\"20140509\",\"appId\":\"com.lge.test\",\"vendorId\":\"com.lge\",\"localizedAppNames\":{\"\":\"LG Remote App\",\"ko-KR\":\"리모컨 앱\",\"zxx-XX\":\"ЛГ Rэмotэ AПП\"},\"localizedVendorNames\":{\"\":\"LG Electronics\"},\"permissions\":[\"TEST_SECURE\",\"CONTROL_INPUT_TEXT\",\"CONTROL_MOUSE_AND_KEYBOARD\",\"READ_INSTALLED_APPS\",\"READ_LGE_SDX\",\"READ_NOTIFICATIONS\",\"SEARCH\",\"WRITE_SETTINGS\",\"WRITE_NOTIFICATION_ALERT\",\"CONTROL_POWER\",\"READ_CURRENT_CHANNEL\",\"READ_RUNNING_APPS\",\"READ_UPDATE_INFO\",\"UPDATE_FROM_REMOTE_APP\",\"READ_LGE_TV_INPUT_EVENTS\",\"READ_TV_CURRENT_TIME\"],\"serial\":\"2f930e2d2cfe083771f68e4fe7bb07\"},\"permissions\":[\"LAUNCH\",\"LAUNCH_WEBAPP\",\"APP_TO_APP\",\"CLOSE\",\"TEST_OPEN\",\"TEST_PROTECTED\",\"CONTROL_AUDIO\",\"CONTROL_DISPLAY\",\"CONTROL_INPUT_JOYSTICK\",\"CONTROL_INPUT_MEDIA_RECORDING\",\"CONTROL_INPUT_MEDIA_PLAYBACK\",\"CONTROL_INPUT_TV\",\"CONTROL_POWER\",\"READ_APP_STATUS\",\"READ_CURRENT_CHANNEL\",\"READ_INPUT_DEVICE_LIST\",\"READ_NETWORK_STATE\",\"READ_RUNNING_APPS\",\"READ_TV_CHANNEL_LIST\",\"WRITE_NOTIFICATION_TOAST\",\"READ_POWER_STATE\",\"READ_COUNTRY_INFO\"],\"signatures\":[{\"signatureVersion\":1,\"signature\":\"eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw==\"}]}}}";

// handshake with client key, for subsequent connections
var hello_w_key = "{\"type\":\"register\",\"id\":\"register_0\",\"payload\":{\"forcePairing\":false,\"pairingType\":\"PROMPT\",\"client-key\":\"CLIENTKEYGOESHERE\",\"manifest\":{\"manifestVersion\":1,\"appVersion\":\"1.1\",\"signed\":{\"created\":\"20140509\",\"appId\":\"com.lge.test\",\"vendorId\":\"com.lge\",\"localizedAppNames\":{\"\":\"LG Remote App\",\"ko-KR\":\"리모컨 앱\",\"zxx-XX\":\"ЛГ Rэмotэ AПП\"},\"localizedVendorNames\":{\"\":\"LG Electronics\"},\"permissions\":[\"TEST_SECURE\",\"CONTROL_INPUT_TEXT\",\"CONTROL_MOUSE_AND_KEYBOARD\",\"READ_INSTALLED_APPS\",\"READ_LGE_SDX\",\"READ_NOTIFICATIONS\",\"SEARCH\",\"WRITE_SETTINGS\",\"WRITE_NOTIFICATION_ALERT\",\"CONTROL_POWER\",\"READ_CURRENT_CHANNEL\",\"READ_RUNNING_APPS\",\"READ_UPDATE_INFO\",\"UPDATE_FROM_REMOTE_APP\",\"READ_LGE_TV_INPUT_EVENTS\",\"READ_TV_CURRENT_TIME\"],\"serial\":\"2f930e2d2cfe083771f68e4fe7bb07\"},\"permissions\":[\"LAUNCH\",\"LAUNCH_WEBAPP\",\"APP_TO_APP\",\"CLOSE\",\"TEST_OPEN\",\"TEST_PROTECTED\",\"CONTROL_AUDIO\",\"CONTROL_DISPLAY\",\"CONTROL_INPUT_JOYSTICK\",\"CONTROL_INPUT_MEDIA_RECORDING\",\"CONTROL_INPUT_MEDIA_PLAYBACK\",\"CONTROL_INPUT_TV\",\"CONTROL_POWER\",\"READ_APP_STATUS\",\"READ_CURRENT_CHANNEL\",\"READ_INPUT_DEVICE_LIST\",\"READ_NETWORK_STATE\",\"READ_RUNNING_APPS\",\"READ_TV_CHANNEL_LIST\",\"WRITE_NOTIFICATION_TOAST\",\"READ_POWER_STATE\",\"READ_COUNTRY_INFO\"],\"signatures\":[{\"signatureVersion\":1,\"signature\":\"eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw==\"}]}}}";
// ---------------------------------------------------------
// get the handshake string used for setting up the ws connection
function get_handshake() {
  if (fs.existsSync(client_key_filename)) {
    var ck = fs.readFileSync(client_key_filename);
    console.log("Client key:" + ck);
    return hello_w_key.replace("CLIENTKEYGOESHERE", ck);

  } else {
    console.log("First usage, let's pair with TV.");
    return hello;
  }
}
// ---------------------------------------------------------
// store the client key on disk so that we don't have to pair next time
function store_client_key(ck) {
  console.log("Storing client key:" + ck);
  fs.writeFileSync(client_key_filename, ck);
}
/*---------------------------------------------------------------------------*/
client.on('connectFailed', function(error) {
    // failed to connect, set timer to retry in a few seconds
    console.log('Connect Error: ' + error.toString());
    setTimeout(function(){connect();}, 5000);
});
/*---------------------------------------------------------------------------*/
// store the connection in a variable with larger scope so that we may later
// refer to it and close connection.
var clientconnection = {};
client.on('connect', function(connection) {
    console.log('WebSocket Client Connected on IP:' + connection.remoteAddress);
    clientconnection = connection;
    //--------------------------------------------------------------------------
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
        throw new Error("Websocket connection error:" + error.toString());
    });
    //--------------------------------------------------------------------------
    connection.on('close', function() {
        console.log('LG TV disconnected');
        clientconnection = {};
        eventemitter.emit("lgtv_ws_closed");
    });
    //--------------------------------------------------------------------------
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var json = JSON.parse(message.utf8Data);
            console.log('<--- received: %s', message.utf8Data);
            // console.log('<--- emitting: %s', json.id);
            eventemitter.emit(json.id, json);
        } else {
            console.log('<--- received: %s', message.toString());
        }
    });
    //--------------------------------------------------------------------------

    handshaken = false;
    var hs = get_handshake();
    console.log("Sending handshake: %s", hs);
    connection.send(hs);
    // connection.sendUTF(hs); // works as well
});
/*---------------------------------------------------------------------------*/
var isConnected = function(){
    if (typeof clientconnection.connected === 'undefined') {
        // console.log("disconnected");
        return false;
    }
    return clientconnection.connected;
};
//------------------------------------------
var close_connection = function(){
    // console.log("disconnecting");
    clientconnection.close();
};
//------------------------------------------
var remote_ip = function(){
    if (typeof clientconnection.remoteAddress === 'undefined') {
        return "0.0.0.0";
    }
    return clientconnection.remoteAddress;
};
//------------------------------------------
var ws_send = function(str){
    if (typeof clientconnection.connected === 'undefined') {
        return false;
    }
    if (typeof str !== 'string') {
        return false;
    }
    if (clientconnection.connected) {
      clientconnection.send(str);
    }
    return clientconnection.connected;
};
/*---------------------------------------------------------------------------*/
// this is the old version, using the ws lib; above is the new, using websocket lib
    // try {
    //   var ws = new WebSocket(wsurl);
    // } catch(err) {
    //   console.log(err);
    //   console.log("Error, could not open websocket (are you connected to the Internet?)");
    //   process.exit(0); // TODO better error handling, what is appropriate here - raise some error.
    // }
    // // ---------------------------------------------------------
    // // callback for when connection is opened, ie the websocket handshake is done and
    // // we should perform TV handshake.
    // ws.on('open', function() {
    //   console.log('opened connection to TV');
    //   // send handshake - will either show prompt on TV (if first connect), or auth us
    //   var hs = get_handshake();
    //   ws.send(hs);
    // });
    // // ---------------------------------------------------------
    // ws.on('close', function() {
    //   console.log('LG TV disconnected');
    //   eventemitter.emit("lgtv_ws_closed");
    // });
    // // ---------------------------------------------------------
    // // callback for when we receive something on the websocket connection: can be
    // // either responses or events
    // ws.on('message', function(message) {
    //   var json = JSON.parse(message);
    //   console.log('<--- received: %s', message);
    //   eventemitter.emit(json.id, json);
    // });
/*---------------------------------------------------------------------------*/
// send the SSDP discover message that the TV will respond to.
var _send_ssdp_discover = function(socket)
{
  var ssdp_rhost = "239.255.255.250";
  var ssdp_rport = 1900;

  // these fields are all required
  var ssdp_msg = 'M-SEARCH * HTTP/1.1\r\n';
  ssdp_msg += 'HOST: 239.255.255.250:1900\r\n';
  ssdp_msg += 'MAN: "ssdp:discover"\r\n';
  ssdp_msg += 'MX: 5\r\n';
  ssdp_msg += "ST: urn:dial-multiscreen-org:service:dial:1\r\n";
  ssdp_msg += "USER-AGENT: iOS/5.0 UDAP/2.0 iPhone/4\r\n\r\n";
  var message = new Buffer(ssdp_msg);

  socket.send(message, 0, message.length, ssdp_rport, ssdp_rhost, function(err, bytes) {
      if (err) throw err;
      // console.log('SSDP message sent to ' + ssdp_rhost +':'+ ssdp_rport);
      // console.log(message.toString());
  });
};
/*---------------------------------------------------------------------------*/
var discover_ip = function(retry_timeout_seconds, tv_ip_found_callback)
{
  var server = dgram.createSocket('udp4');
  var timeout = 0;
  var cb = tv_ip_found_callback || undefined;

  // sanitize parameters and set default otherwise
  if (retry_timeout_seconds && typeof(retry_timeout_seconds) === 'number') {
    timeout = retry_timeout_seconds;
  } else if (!tv_ip_found_callback && typeof(retry_timeout_seconds) === 'function') {
    // overloading, the first parameter was not a timeout, but the callback
    // and we thus assume no timeout is given
    cb = retry_timeout_seconds;
  }

  // when server has opened, send a SSDP discover message
  server.on('listening', function() {
    _send_ssdp_discover(server);

    // retry automatically if set
    if (timeout > 0) {
      // set timeout before next probe
      // XXXXX
      // after timeout seconds, invoke callback indicating failure
      // cb(true, "");
    }
  });

  // scan incoming messages for the magic string
  server.on('message', function(message, remote) {
    if (message.indexOf("LG Smart TV")) {
      server.close();
      if (cb) {
        cb(false, remote.address);
      }
    }
  });
  
  server.bind(); // listen to 0.0.0.0:random
  return server;
};
/*---------------------------------------------------------------------------*/
// send a command to the TV after having established a paired connection
var command_count = 0;

var send_command = function(prefix, msgtype, uri, payload, fn) {
  command_count++;
  var msg = '{"id":"' + prefix + command_count + '","type":"' + msgtype + '","uri":"' + uri + '"';
  if (typeof payload === 'string' && payload.length > 0) {
    msg += ',"payload":' + payload + "}";
  } else {
    msg += "}";
  }
  console.log("---> Sending command:" + msg);

  // if we were provided a callback, we register an event emitter listener for this.
  // note: there is a clear risk of memory leaks should we have a lot of outstanding
  // requests that never gets responses as the listeners are only cleared on response
  // or websocket close.
  try {
    if (typeof fn === 'function') {
      eventemitter.once(prefix + command_count, function (message) {
        // console.log("*** emitter listener for " + prefix + command_count + " with message:" + message); 
        fn(RESULT_OK, message);
      });
    }
    ws_send(msg);

  } catch(err) {
    console.log("Error, not connected to TV:" + err.toString());
    if (typeof fn === 'function') {
      fn(RESULT_ERROR, "not connected");
    }
  }
};
//------------------------------------------
var open_connection = function(host, fn){
    // console.log("connecting");
    clientconnection = {};
    try {
      client.connect(host);
      fn(RESULT_OK, {});
    } catch(error) {
      fn(RESULT_ERROR, error.toString());
    }
};
/*---------------------------------------------------------------------------*/
// verify that the provided host string contains ws protocol and port 3000,
// valid input examples:
//    lgsmarttv.lan
//    192.168.1.86
//    192.168.1.86:3000
//    ws://192.168.1.86:3000
//    ws://192.168.1.86
// if protocol or port is lacking, they are added
// returns either the corrected host string, or false if totally invalid hoststring

var _check_host_string = function(hoststr)
{
  if (hoststr.indexOf("ws://") !== 0) {
    hoststr = "ws://" + hoststr;
  }
  if (hoststr.indexOf(":3000") !== (hoststr.length - 5)) {
    hoststr += ":3000";
  }

  return hoststr;
};
/*---------------------------------------------------------------------------*/
// Connect to TV using either a host string (eg "192.168.1.213", "lgsmarttv.lan")
// or undefined for using the default "lgsmarttv.lan"

var connect = function(host, fn) {
  // if already connected, no need to connect again
  // (unless hostname is new, but this package is basically written for the usecase
  // of having a single TV on the LAN)
  if (isConnected() && handshaken) {
    if (typeof fn === 'function') {
      fn(RESULT_OK, {});
    }
    return;
  }

  // sanitize and set hostname
  if (host === undefined) {
    // no hostname specified, use default
    host = wsurl;
  } else if (typeof(host) !== 'string') {
    // XXXXX error, argument error
    // throw something or at least give ample warning
    host = wsurl;
  }
  host = _check_host_string(host);
  if (host === false) {
    // provided host string is wrong, throw something
    // XXXX
  }

  // open websocket connection and perform handshake
  open_connection(host, function(err, msg){
    if (!err) {
        // The connection was opened and the ws connection callback will automatically
        // send the handshake, but we here register the listener for the response to
        // that handshake; should be moved for code clarity
        eventemitter.on("register_0", function (message) {
          var ck = message.payload["client-key"];
          if (typeof ck === 'undefined') {

          } else {
            store_client_key(ck);
            handshaken = true;
            if (typeof fn === 'function') {
              fn(RESULT_OK, {});
            }
          }
          //  {"type":"registered","id":"register_0","payload":{"client-key":"a32c6abeab6a601d626ccdeb4749f0fa"}}
        });
    } else {
        if (typeof fn === 'function') {
          fn(RESULT_ERROR, msg);
        }
    }
  });
};
/*---------------------------------------------------------------------------*/
var ip = function() {
  return remote_ip();
};
/*---------------------------------------------------------------------------*/
var connected = function() {
  return isConnected();
};
/*---------------------------------------------------------------------------*/
var disconnect = function(fn) {
  close_connection();
  eventemitter.once("lgtv_ws_closed", function () {
    if(typeof fn === 'function') {
      fn(RESULT_OK);
    }
  });
};
// ---------------------------------------------------------
// show a float on the TV
var unsubscribe = function(id, fn) {
  var msg = '{"id":"' + id + '","type":"unsubscribe"}';
  console.log("---> Sending command:" + msg);
  try {
    if (typeof fn === 'function') {
      eventemitter.once(prefix + command_count, function (message) {
        // console.log("*** emitter listener for " + prefix + command_count + " with message:" + message); 
        fn(RESULT_OK, message);
      });
    }
    ws_send(msg);
    // ws.send(msg);

  } catch(err) {
    console.log("Error, not connected to TV.");
    if (typeof fn === 'function') {
      fn(RESULT_ERROR, "not connected");
    }
  }
};
// ---------------------------------------------------------
// show a float on the TV
function show_float(text, fn) {
  send_command("", "request", "ssap://system.notifications/createToast", '{"message": "MSG"}'.replace('MSG', text), fn);
}
// ---------------------------------------------------------
// launch browser at URL; will open a new tab if already open
function open_browser_at(url, fn) {
  // response: {"type":"response","id":"0","payload":{"returnValue":true,"id":"com.webos.app.browser","sessionId":"Y29tLndlYm9zLmFwcC5icm93c2VyOnVuZGVmaW5lZA=="}}

  // must start with http:// or https://
  console.log('opening browser at:%s', url);
  var protocol = url.substring(0, 7).toLowerCase();
  if (protocol !== 'http://' && protocol !== 'https:/') {
    url = "http://" + url;
  }

  send_command("", "request", "ssap://system.launcher/open", JSON.stringify({target: url}), function(err, resp){
    var ret = "";
    if (!err) {
      ret = {sessionId: resp.payload.sessionId};
    } else {
      ret = JSON.stringify(response);
    }
    fn(err, ret);
  });
}
/*---------------------------------------------------------------------------*/
var turn_off = function(fn) {
  send_command("", "request", "ssap://system/turnOff", null, fn);
};
/*---------------------------------------------------------------------------*/
var channellist = function(fn) {
  send_command("channels_", "request", "ssap://tv/getChannelList", null, function(err, resp) {
  // send_command("channels_", "subscribe", "ssap://tv/getChannelList", null, function(err, resp) {
    if (!err) {
      try {
        // extract channel list
        var channellistarray = resp.payload.channelList;
        var retlist = {channels : []};
        for (var i = channellistarray.length - 1; i >= 0; i--) {
          var ch = {id: channellistarray[i].channelId,
                    name: channellistarray[i].channelName,
                    number: channellistarray[i].channelNumber};
          // console.log(channellistarray[i]);
          console.log(ch);
          retlist.channels.push(ch);
        }
        fn(RESULT_OK, JSON.stringify(retlist));
      
      } catch(e) {
        console.log("Error:" + e);
        fn(RESULT_ERROR, resp);
      }
    
    } else {
      console.log("Error:" + err);
      fn(RESULT_ERROR, err);
    }
  });
};
/*---------------------------------------------------------------------------*/
var channel = function(fn) {
  // send_command("channels_", "subscribe", "ssap://tv/getCurrentChannel", null, function(err, resp) {
  send_command("channels_", "request", "ssap://tv/getCurrentChannel", null, function(err, resp) {
// {"type":"response","id":"channels_1","payload": {"channelId":"0_13_7_0_0_1307_0","signalChannelId":"0_1307_0","channelModeId":0,"channelModeName":"Terrestrial","channelTypeId":0,"channelTypeName":"Terrestrial Analog TV","channelNumber":"7","channelName":"SVT  ","physicalNumber":13,"isSkipped":false,"isLocked":false,"isDescrambled":false,"isScrambled":false,"isFineTuned":false,"isInvisible":false,"favoriteGroup":null,"hybridtvType":null,"dualChannel":{"dualChannelId":null,"dualChannelTypeId":null,"dualChannelTypeName":null,"dualChannelNumber":null},"returnValue":true}}

    if (typeof fn === 'function') {
      if (!err) {
        if (resp.error) {
          fn(RESULT_ERROR, "Error, probably not TV input right now");
        } else {
          // return a subset of all information
          fn(RESULT_OK, {id: resp.payload.channelId, // internal id, used for setting channel
                         name: resp.payload.channelName, // name as on TV, eg SVT
                         number: resp.payload.channelNumber}); // number on TV
        }
      } else {
        console.log("Error:" + err);
        fn(RESULT_ERROR, "Error, could not get answer");
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
/* set the active channel; use channelId as from the channellist, such as eg 0_13_7_0_0_1307_0 */
var set_channel = function(channel, fn) {
  send_command("", "request", "ssap://tv/openChannel", JSON.stringify({channelId: channel}), function(err, resp){
    if (err) {
      fn(err, {});
    } else {
      if (resp.type == "response") {
        // {"type":"response","id":"1","payload":{"returnValue":true}}
        fn(RESULT_OK, channel);
      } else if (resp.type == "error") {
        // {"type":"error","id":"1","error":"500 Application error","payload":{"returnValue":false,"errorCode":-1000,"errorText":"invalid channel id"}}
        fn(RESULT_ERROR, resp.payload.errorText);
      } else {
        fn(RESULT_ERROR, "unknown error");
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
// note: the TV does not consider 'live TV' as part of the external input list.
// This will just return eg HDMI_1, HDMI_2, SCART_1, etc.
var inputlist = function(fn) {
  // send_command("input_", "subscribe", "ssap://tv/getExternalInputList", null, function(err, resp) {
  send_command("input_", "request", "ssap://tv/getExternalInputList", null, function(err, resp) {
    if (typeof fn === 'function') {
// <--- received: {"type":"response","id":"input_1","payload": {"devices":[{"id":"SCART_1","label":"AV1","port":1,"appId":"com.webos.app.externalinput.scart","icon":"http://lgsmarttv.lan:3000/resources/f84946f3119c23cda549bdcf6ad02a89c73f7682/scart.png","modified":false,"autoav":false,"currentTVStatus":"","subList":[],"subCount":0,"connected":false,"favorite":false},{...}, {...}],"returnValue":true}}
      if (!err) {
        try {
          // extract a nice and simple inputlist
          var devs = resp.payload.devices;
          var ret = {};
          for (var i = devs.length - 1; i >= 0; i--) {
            ret[devs[i].id] = devs[i].icon;
          }
          console.log(ret);
          
          fn(RESULT_OK, ret);
        } catch(error) {
          console.log("Error:" + error);
          fn(RESULT_ERROR, error);
        }
      } else {
        console.log("Error:" + err);
        fn(RESULT_ERROR, err);
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
// get current input source
var input = function(fn) {
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
// set input source
var set_input = function(input, fn) {
  send_command("", "request", "ssap://tv/switchInput", JSON.stringify({inputId: input}), function(err, resp){
    if (err) {
      fn(RESULT_ERROR, resp);
    } else {
      if (resp.payload.errorCode) {
        fn(RESULT_ERROR, resp.payload.errorText);
        // {"type":"response","id":"1","payload":{"returnValue":true,"errorCode":-1000,"errorText":"no such input"}}
      } else {
        fn(RESULT_OK, input);
        // {"type":"response","id":"1","payload":{"returnValue":true}}
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
// set mute
var set_mute = function(setmute, fn) {
  if(typeof setmute !== 'boolean') {
    fn(RESULT_ERROR, {reason: "mute must be boolean"});
  } else {
    send_command("", "request", "ssap://audio/setMute", JSON.stringify({mute: setmute}), fn);
  }
};
/*---------------------------------------------------------------------------*/
var toggle_mute = function(fn) {
  muted(function(err, resp){
    if (!err) {
      var tomute = !resp;
      send_command("", "request", "ssap://audio/setMute", JSON.stringify({mute: tomute}), fn);
    } else {
      fn(err, {});
    }
  });
};
/*---------------------------------------------------------------------------*/
var muted = function(fn) {
  send_command("status_", "request", "ssap://audio/getStatus", null, function(err, response){
    if (!err) {
      fn(RESULT_OK, response.payload.mute);
    } else {
      fn(RESULT_ERROR, response);
    }
  });
};
/*---------------------------------------------------------------------------*/
// get volume as 0..100 if not muted, if muted then volume is -1
var volume = function(fn) {
  // send_command("status_", "subscribe", "ssap://audio/getVolume", null, function(err, response){
  send_command("status_", "request", "ssap://audio/getVolume", null, function(err, response){
  // {"type":"response","id":"status_1","payload":{"muted":false,"scenario":"mastervolume_tv_speaker","active":false,"action":"requested","volume":7,"returnValue":true,"subscribed":true}}
    if (!err) {
      var muted = response.payload.muted;
      var ret = -1;
      if (!muted) {
        ret = response.payload.volume;
      }
      fn(RESULT_OK, ret);
    } else {
      fn(RESULT_ERROR, response);
    }
  });
};
/*---------------------------------------------------------------------------*/
var set_volume = function(volumelevel, fn) {
  if (typeof volumelevel !== 'number') {
    fn(RESULT_ERROR, "volume must be a number");

  } else if(volumelevel < 0 || volumelevel > 100) {
    fn(RESULT_ERROR, "volume must be 0..100");

  } else {
    send_command("", "request", "ssap://audio/setVolume", JSON.stringify({volume: volumelevel}), fn);
  }
};
/*---------------------------------------------------------------------------*/
var input_media_play = function(fn) {
  send_command("", "request", "ssap://media.controls/play", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_media_stop = function(fn) {
  send_command("", "request", "ssap://media.controls/stop", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_media_pause = function(fn) {
  send_command("", "request", "ssap://media.controls/pause", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_media_rewind = function(fn) {
  send_command("", "request", "ssap://media.controls/rewind", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_media_forward = function(fn) {
  send_command("", "request", "ssap://media.controls/fastForward", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_channel_up = function(fn) {
  send_command("", "request", "ssap://tv/channelUp", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_channel_down = function(fn) {
  send_command("", "request", "ssap://tv/channelDown", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_three_d_on = function(fn) {
  send_command("", "request", "ssap://com.webos.service.tv.display/set3DOn", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_three_d_off = function(fn) {
  send_command("", "request", "ssap://com.webos.service.tv.display/set3DOff", null, fn);
};
/*---------------------------------------------------------------------------*/
var get_status = function(fn) {
  send_command("status_", "request", "ssap://audio/getStatus", null, fn);
  // send_command("status_", "subscribe", "ssap://audio/getStatus", null, fn);
};
/*---------------------------------------------------------------------------*/
var sw_info = function(fn) {
  send_command("sw_info_", "request", "ssap://com.webos.service.update/getCurrentSWInformation", null, fn);
// received: {"type":"response","id":"sw_info_0","payload":{"returnValue":true,"product_name":"webOS","model_name":"HE_DTV_WT1M_AFAAABAA","sw_type":"FIRMWARE","major_ver":"04","minor_ver":"41.32","country":"SE","device_id":"cc:2d:8c:cf:94:8c","auth_flag":"N","ignore_disable":"N","eco_info":"01","config_key":"00","language_code":"sv-SE"}}
};
/*---------------------------------------------------------------------------*/
var services = function(fn) {
  send_command("services_", "request", "ssap://api/getServiceList", null, function(err, resp) {
    if (typeof fn === 'function') {
      if (!err) {
        try {
// received: {"type":"response","id":"services_1","payload":{"services":[{"name":"api","version":1},{"name":"audio","version":1},{"name":"media.controls","version":1},{"name":"media.viewer","version":1},{"name":"pairing","version":1},{"name":"system","version":1},{"name":"system.launcher","version":1},{"name":"system.notifications","version":1},{"name":"tv","version":1},{"name":"webapp","version":2}],"returnValue":true}}
          var services = resp.payload.services;
          fn(RESULT_OK, resp.payload.services);
        } catch(e) {
          console.log("Error:" + e);
          fn(RESULT_ERROR, e);
        }
      } else {
        console.log("Error:" + err);
        fn(RESULT_ERROR, err);
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
var apps = function(fn) {
  send_command("launcher_", "request", "ssap://com.webos.applicationManager/listLaunchPoints", null, function(err, response) {
  // send_command("launcher_", "subscribe", "ssap://com.webos.applicationManager/listLaunchPoints", null, function(err, response) {
    if (typeof fn === 'function') {
      if (!err) {
        try {
          // extract a nice and simple list of apps
          var applist = {};
          var launchpoints = response.payload.launchPoints;
          for (var i = launchpoints.length - 1; i >= 0; i--) {
            // var oneapp = {};
            // oneapp["title"] = launchpoints[i]["title"];
            // oneapp["id"] = launchpoints[i]["launchPointId"];
// {"removable":false,"largeIcon":"/mnt/otncabi/usr/palm/applications/com.webos.app.discovery/lgstore_130x130.png","vendor":"LGE","id":"com.webos.app.discovery","title":"LG Store","bgColor":"","vendorUrl":"","iconColor":"#cf0652","appDescription":"","params":{},"version":"1.0.18","bgImage":"/mnt/otncabi/usr/palm/applications/com.webos.app.discovery/lgstore_preview.png","icon":"http://lgsmarttv.lan:3000/resources/60ad544bd03663793dda37dbb21f10575408c73a/lgstore_80x80.png","launchPointId":"com.webos.app.discovery_default","imageForRecents":""},
            applist[launchpoints[i]["title"]] = launchpoints[i]["launchPointId"];
          }
          console.log("Returning applist:");
          console.log(applist);
          fn(RESULT_OK, applist);
        } catch(e) {
          console.log("Error:" + e);
          fn(RESULT_ERROR, e);
        }
      } else {
        console.log("Error:" + err);
        fn(RESULT_ERROR, err);
      }
    }
  });
};
/*---------------------------------------------------------------------------*/
function open_app_with_payload(payload, fn) {
    send_command("", "request", "ssap://com.webos.applicationManager/launch", payload, null, fn);
}
/*---------------------------------------------------------------------------*/
var start_app = function(appid, fn) {
  send_command("", "request", "ssap://system.launcher/launch", JSON.stringify({id: appid}), function(err, resp){
    if (!err) {
      if (resp.payload.errorCode) {
        fn(RESULT_ERROR, resp.payload.errorText);
        // {"type":"error","id":"1","error":"500 Application error","payload":{"returnValue":false,"errorCode":-101,"errorText":"\"bogusapp\" was not found OR Unsupported Application Type"}}
      } else {
        fn(RESULT_OK, {sessionId : resp.payload.sessionId});
      }
    } else {
      fn(err, resp);
    }
  });
};
/*---------------------------------------------------------------------------*/
var close_app = function(appid, fn) {
  send_command("", "request", "ssap://system.launcher/close", JSON.stringify({id: appid}), function(err, resp){
    if (!err) {
      if (resp.payload.errorCode) {
        // Note: This error response may come as a result of trying to close an app
        // that is not already open
        // {"type":"error","id":"1","error":"500 Application error","payload":{"returnValue":false,"errorCode":-1000,"errorText":"Permission denied"}}
        fn(RESULT_ERROR, resp.payload.errorText);
      } else {
        fn(RESULT_OK, {sessionId : resp.payload.sessionId});
      }
    } else {
      fn(err, resp);
    }
  });
};
/*---------------------------------------------------------------------------*/
var input_pointer_connect = function(fn) {
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_pointer_move = function(dx, dy, fn) {
    // function sendMove(dx, dy) {
    //         pointerSocket.sendLogMessage('type:move\ndx:' + dx + '\ndy:' + dy + '\ndown:0\n\n')
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_pointer_click = function(fn) {
    // function sendClick() {
    //         pointerSocket.sendLogMessage('type:click\n\n')
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_pointer_disconnect = function(fn) {
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_text = function(text, fn) {
    // is this the right call for the right API here?
    // function sendInput(btype, bname) {
    //         pointerSocket.sendLogMessage('type:' + btype + '\nname:' + bname + '\n\n')
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_pointer_scroll = function(dx, dy, fn) {
  // pointerSocket.sendLogMessage('type:scroll\ndx:0\ndy:' + dy + '\ndown:0\n\n')
  if (typeof fn === 'function') {
    fn(RESULT_ERROR, {reason: "not implemented"});
  }
};
/*---------------------------------------------------------------------------*/
var input_enter = function(fn) {
  send_command("", "request", "ssap://com.webos.service.ime/sendEnterKey", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_pause = function(fn) {
  send_command("pause_", "request", "ssap://media.controls/pause", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_play = function(fn) {
  send_command("play_", "request", "ssap://media.controls/play", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_stop = function(fn) {
  send_command("stop_", "request", "ssap://media.controls/stop", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_volumeup = function(fn) {
  send_command("volumeup_", "request", "ssap://audio/volumeUp", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_volumedown = function(fn) {
  send_command("volumedown_", "request", "ssap://audio/volumeDown", null, fn);
};
/*---------------------------------------------------------------------------*/
var input_backspace = function(count, fn) {
  var c = count === undefined ? 1 : count;
  send_command("", "request", "ssap://com.webos.service.ime/deleteCharacters", {"count": c}, fn);
};
/*---------------------------------------------------------------------------*/
var open_youtube_at_id = function(video_id, fn) {
  var vurl = "http://www.youtube.com/tv?v=" + video_id;
  open_youtube_at_url(vurl, fn);
};
/*---------------------------------------------------------------------------*/
var open_youtube_at_url = function(url, fn) {
  var youtube_appid = "youtube.leanback.v4";
  var payload = {id: youtube_appid, params : {contentTarget: url}};
  send_command("", "request", "ssap://system.launcher/launch", JSON.stringify(payload), function(err, resp){
    if (!err) {
      if (resp.payload.errorCode) {
        fn(RESULT_ERROR, resp.payload.errorText);
        // {"type":"error","id":"1","error":"500 Application error","payload":{"returnValue":false,"errorCode":-101,"errorText":"\"bogusapp\" was not found OR Unsupported Application Type"}}
      } else {
        fn(RESULT_OK, {sessionId : resp.payload.sessionId});
      }
    } else {
      fn(err, resp);
    }
  });


    // public void launchAppWithInfo(final AppInfo appInfo, Object params, final Launcher.AppLaunchListener listener) {
    //     String uri = "ssap://system.launcher/launch";
    //     contentId = (String) ((JSONObject) params).get("contentId");
    //     payload.put("id", appId);
    //     payload.put("contentId", contentId);
    //     payload.put("params", params);

// {id : youtube.leanback.v4}
// {contentTarget: url}

  // open_app_with_payload({"id": "youtube.leanback.v4", "params": { "contentTarget": video_url }});
};
/*---------------------------------------------------------------------------*/
var temporarydbg = function(count, fn) {
  // send_command("http_header_", "request", "ssap://com.webos.service.sdx/getHttpHeaderForServiceRequest", null, fn);
  // {"type":"response","id":"http_header_1","payload":
  // {"returnValue":true,"header":"X-Device-Product:webOS\r\nX-Device-Platform:WT1M\r\nX-Device-Model:HE_DTV_WT1M_AFAAABAA\r\nX-Device-Netcast-Platform-Version:1.3.2\r\nX-Device-Eco-Info:01\r\nX-Device-Country-Group:EU\r\nX-Device-Publish-Flag:Y\r\nX-Device-ContentsQA-Flag:N\r\nX-Device-FW-Version:04.41.32\r\nX-Device-SDK-VERSION:1.3.2\r\nX-Device-ID:hEPv0JRPP5oIzP9mv9lAdGC1SC2CKe/SFzOGJKQv1hoygpWsNib7+mbwPklqA2FPj1KXM8l79B43RorjNIifB9g776LqceGmvucarN2tHbRrqzflDsU9MF50NCMH7ili\r\nX-Device-Sales-Model:60LB870V-ZA\r\nX-Device-Type:T01\r\nAccept:application/json\r\nX-Device-Language:sv-SE\r\nX-Device-Locale:sv-SE\r\nX-Device-Country:SE\r\nHOST:SE.lgtvsdp.com\r\nX-Device-Remote-Flag:N\r\nX-Device-FCK:81\r\nX-Device-Eula:additionalDataAllowed,generalTermsAllowed,networkAllowed,voiceAllowed\r\nX-Authentication:+dNxJb6+Al+Y6NmHAGXchGJm55U=\r\ncookie:JSESSIONID=KqU+lnNuRtbCrV0u6iFR4VIE.node_sdp20; Path=/rest; Secure\r\n","X-Device-Product":"webOS","X-Device-Platform":"WT1M","X-Device-Model":"HE_DTV_WT1M_AFAAABAA","X-Device-Netcast-Platform-Version":"1.3.2","X-Device-Eco-Info":"01","X-Device-Country-Group":"EU","X-Device-Publish-Flag":"Y","X-Device-ContentsQA-Flag":"N","X-Device-FW-Version":"04.41.32","X-Device-SDK-VERSION":"1.3.2","X-Device-ID":"hEPv0JRPP5oIzP9mv9lAdGC1SC2CKe/SFzOGJKQv1hoygpWsNib7+mbwPklqA2FPj1KXM8l79B43RorjNIifB9g776LqceGmvucarN2tHbRrqzflDsU9MF50NCMH7ili","X-Device-Sales-Model":"60LB870V-ZA","X-Device-Type":"T01","Accept":"application/json","X-Device-Language":"sv-SE","X-Device-Locale":"sv-SE","X-Device-Country":"SE","HOST":"SE.lgtvsdp.com","X-Device-Remote-Flag":"N","X-Device-FCK":"81","X-Device-Eula":"additionalDataAllowed,generalTermsAllowed,networkAllowed,voiceAllowed","X-Authentication":"+dNxJb6+Al+Y6NmHAGXchGJm55U=","cookie":"JSESSIONID=KqU+lnNuRtbCrV0u6iFR4VIE.node_sdp20; Path=/rest; Secure"}}


  // send_command("launcher_", "subscribe", "ssap://com.webos.applicationManager/listLaunchPoints", null, fn);
  // response is same or at least very similar to list apps
  fn(false, {});

// other ssap endpoints:
  // ssap://tv/getCurrentChannel
  // ssap://tv/getChannelProgramInfo
  // ssap://com.webos.applicationManager/getForegroundAppInfo
  // ssap://com.webos.service.appstatus/getAppStatus
  // ssap://system.launcher/getAppState
  // ssap://tv/getChannelProgramInfo
  // ssap://media.viewer/close
  // ssap://webapp/closeWebApp
};
/*---------------------------------------------------------------------------*/
// commands related to input such as remote control and text input
exports.input_enter = input_enter; /* remote control 'enter' */
exports.input_pause = input_pause; /* remote control 'pause' */
exports.input_play = input_play; /* remote control 'play' */
exports.input_stop = input_stop; /* remote control 'stop' */
exports.input_volumeup = input_volumeup; /* remote control 'volume up' */
exports.input_volumedown = input_volumedown; /* remote control 'volume down' */
exports.input_channel_up = input_channel_up; /* remote control volume up */
exports.input_channel_down = input_channel_down; /* remote control volume down */
exports.input_media_play = input_media_play; /* remote control play */
exports.input_media_stop = input_media_stop; /* remote control stop */
exports.input_media_pause = input_media_pause; /* remote control pause */
exports.input_media_rewind = input_media_rewind; /* remote control rewind */
exports.input_media_forward = input_media_forward; /* remote control forward */
exports.input_three_d_on = input_three_d_on; /* remote control 3d on */
exports.input_three_d_off = input_three_d_off; /* remote control 3d off */
exports.input_backspace = input_backspace; /* send 'backspace' */
exports.input_text = input_text; /* insert text */
exports.input_pointer_connect = input_pointer_connect; /* get pointer (like mouse pointer) */
exports.input_pointer_scroll = input_pointer_scroll; /* scroll */
exports.input_pointer_move = input_pointer_move; /* move the pointer */
exports.input_pointer_click = input_pointer_click; /* click pointer */
exports.input_pointer_disconnect = input_pointer_disconnect; /* disconnect the pointer */

// apps such as youtube, browser, and anything that may be installed
exports.open_youtube_at_id = open_youtube_at_id; /* open youtube at videoid */
exports.open_youtube_at_url = open_youtube_at_url; /* open youtube at url */
exports.open_browser_at = open_browser_at; /* open webbrowser at url */
exports.apps = apps; /* get list of apps */
exports.start_app = start_app; /* start app */
exports.close_app = close_app; /* close app */

// TV source input-related
exports.inputlist = inputlist; /* get list of inputs */
exports.input = input; /* get active input source */
exports.set_input = set_input; /* set input source */

// sound volume related
exports.set_mute = set_mute;
exports.toggle_mute = toggle_mute;
exports.muted = muted; /* is the TV muted? */
exports.volume = volume; /* get volume */
exports.set_volume = set_volume; /* set volume */

// connect and power related
exports.discover_ip = discover_ip; /* discover the TV IP address */
exports.connect = connect; /* connect to TV */
exports.disconnect = disconnect; /* disconnect from TV */
exports.turn_off = turn_off; /* turn the TV off */

// various status/state information
exports.get_status = get_status; /* get status information from TV */
exports.sw_info = sw_info; /* get software info such as webos version */
exports.services = services; /* get available services on the TV */
exports.ip = ip; /* get the TV IP-address */
exports.connected = connected;  /* are we connected to the TV? */
exports.show_float = show_float; /* show a small information box with text on the TV */

// set, get channels
exports.channellist = channellist; /* get list of channels available */
exports.channel = channel; /* get active channel */
exports.set_channel = set_channel; /* set active channel */

// debug and temporary
exports.temporarydbg = temporarydbg;
/*---------------------------------------------------------------------------*/
