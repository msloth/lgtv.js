# LGTV2

[![NPM version](https://badge.fury.io/js/lgtv2.svg)](http://badge.fury.io/js/lgtv2)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/lgtv2.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/lgtv2)
[![Build Status](https://travis-ci.org/hobbyquaker/lgtv2.svg?branch=master)](https://travis-ci.org/hobbyquaker/lgtv2)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

Simple Node.js module to remote control LG WebOS smart TVs.

> this is a fork of [LGTV.js](https://github.com/msloth/lgtv.js), heavily modified and rewritten to suite my needs.

With __v1.4.0__ the location and filename of the keyFile is changed, so you likely will have to accept the connection on 
your TV again after upgrading to 1.4.0.


## Installation

`npm install lgtv2`

## TV configuration

You need to allow "LG Connect Apps" on your TV - see http://www.lg.com/uk/support/product-help/CT00008334-1437131798537-others

## Usage Examples


Subscribe to volume and mute changes and output to console:
```javascript

var lgtv = require("lgtv2")({
    url: 'ws://lgwebostv:3000'
});

lgtv.on('connect', function () {
    console.log('connected');
    
    lgtv.subscribe('ssap://audio/getVolume', function (err, res) {
        if (res.changed.indexOf('volume') !== -1) console.log('volume changed', res.volume);
        if (res.changed.indexOf('muted') !== -1) console.log('mute changed', res.muted);
    });
    
});
```

Turn TV off:
```javascript

var lgtv = require("lgtv2")({
    url: 'ws://lgwebostv:3000'
});

lgtv.on('connect', function () {
    console.log('connected');
    lgtv.request('ssap://system/turnOff', function (err, res) {
        lgtv.disconnect();
    });
    
});
```

## API

### options

* url - websocket url of TV. default: 'ws://lgwebostv:3000'
* timeout - request timeout in milliseconds, default: 15000
* reconnect - reconnect interval in milliseconds, default: 5000
* keyFile - path for key storage. Will be suffixed with hostname/ip of TV. default: "~/.lgtv2/keyfile-"
* saveKey - you can override this with your own function for saving the key
* clientKey - you have to supply the key here if you're using a custom saveKey method

### methods

#### request(url [, payload] [, callback])

Payload and callback params are optional. 

#### subscribe(url, callback)

#### disconnect()

Closes the connection to the TV and stops auto-reconnection.

#### getSocket(url, callback)

Get specialized socket connection for mouse and button events

Example:
```Javascript
lgtv.getSocket(
    'ssap://com.webos.service.networkinput/getPointerInputSocket',
    function(err, sock) {
        if (!err) {
            sock.send('click');
        }
    }
);
```

### events

#### prompt

is called when TV prompts for App authorization

#### connect

is called when a connection is established and authorized

#### connecting

is called when trying to connect to the TV

#### close


#### error

is called when Websocket connection errors occur. Subsequent equal errors will only be emitted once (So your log isn't 
flooded with EHOSTUNREACH errors if your TV is off)



## Commands


#### api/getServiceList

#### audio/setMute

Enable/Disable mute

Example: ```lgtv.request('ssap://audio/setMute', {mute: true});```

#### audio/getStatus

#### audio/getVolume

#### audio/setVolume

Example: ```lgtv.request('ssap://audio/setVolume', {volume: 10});```

#### audio/volumeUp

#### audio/volumeDown

#### com.webos.applicationManager/getForegroundAppInfo

#### com.webos.applicationManager/launch

#### com.webos.applicationManager/listLaunchPoints

#### com.webos.service.appstatus/getAppStatus

#### com.webos.service.ime/sendEnterKey

#### com.webos.service.ime/deleteCharacters

#### com.webos.service.tv.display/set3DOn

#### com.webos.service.tv.display/set3DOff

#### com.webos.service.update/getCurrentSWInformation

#### media.controls/play

Example: ```lgtv.request('ssap://media.controls/play');```

#### media.controls/stop

#### media.controls/pause

Example: ```lgtv.request('ssap://media.controls/pause');```

#### media.controls/rewind

#### media.controls/fastForward

#### media.viewer/close

#### system/turnOff

#### system.notifications/createToast

Show a Popup Window.

Example: ```lgtv.request('ssap://system.notifications/createToast', {message: 'Hello World!'});```

#### system.launcher/close

#### system.launcher/getAppState

#### system.launcher/launch

Start an app.

Example: ```lgtv.request('ssap://system.launcher/launch', {id: 'netflix'});```

#### system.launcher/open

#### tv/channelDown

#### tv/channelUp

#### tv/getChannelList

#### tv/getChannelProgramInfo

#### tv/getCurrentChannel

#### tv/getExternalInputList

#### tv/openChannel

#### tv/switchInput

#### webapp/closeWebApp



## License

MIT (c) [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE

