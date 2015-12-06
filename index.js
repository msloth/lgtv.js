/**
 *      lgtv2 - Simple Node.js module to remote control LG WebOS smart TVs
 *
 *      MIT (c) 2015 Sebastian Raff <hq@ccu.io> (https://github.com/hobbyquaker)
 *      this is a fork of https://github.com/msloth/lgtv.js, heavily modified and stripped down to suite my needs.
 *
 */

var fs = require('fs'); // for storing client key
var WebSocketClient = require('websocket').client; // for communication with TV
var EventEmitter = require('events').EventEmitter;
var util =  require('util');

var LGTV = function (config) {
    if (!(this instanceof LGTV)) return new LGTV(config);
    var that = this;

    if (!config.url) throw new Error('websocket url missing');
    config.timeout = config.timeout || 15000;
    config.reconnect = typeof config.reconnect === 'undefined' ? 5000 : config.reconnect;
    config.keyFile = (config.keyFile ? config.keyFile : './lgtv-') + config.url.replace(/[a-z]+:\/\/([0-9a-zA-Z-_.]+):[0-9]+/, '$1');

    try {
        that.key = fs.readFileSync(config.keyFile).toString();
    } catch (e) {
        //console.error(config.keyFile, e);
    }

    that.saveKey = function (key, cb) {
        //console.log('saveKey', config.address, key);
        that.key = key;
        fs.writeFile(config.keyFile, key, cb);
    };

    var client = new WebSocketClient();
    var clientconnection = {};
    var handshaken = false;
    var autoReconnect = !!config.reconnect;

    var callbacks = {};
    var cidCount = 0;
    var cidPrefix = ('0000000' + (Math.floor(Math.random() * 0xFFFFFFFF).toString(16))).slice(-8);

    function getCid() {
        return cidPrefix + ('000' + (cidCount++).toString(16)).slice(-4);
    }

    var handshake = require('./handshake.json');

    client.on('connectFailed', function (error) {
        //console.log('connect failed', error);
        that.emit('error', error);

        if (config.reconnect) {
            setTimeout(function () {
                if (autoReconnect) that.connect(config.url);
            }, config.reconnect);
        }
    });

    client.on('connect', function (connection) {
        //console.log('client connect', connection);
        clientconnection = connection;

        connection.on('error', function (error) {
            //console.log('connection error', error);
            that.emit('error', error);
        });

        connection.on('close', function (e) {
            //console.log('connection close', arguments);
            clientconnection = {};
            delete connection;
            for (var i in callbacks) {
                delete callbacks[i];
            }
            that.emit('close', e);
            if (config.reconnect) {
                setTimeout(function () {
                    if (autoReconnect) that.connect(config.url);
                }, config.reconnect);
            }

        });

        connection.on('message', function (message) {
            //console.log('connection message', message);
            if (message.type === 'utf8') {
                try {
                    message = JSON.parse(message.utf8Data);
                    //console.log('<--', message);

                    if (message.id === 'register_0') {

                        //console.log('!!! reg 0');
                        var ck = message.payload["client-key"];
                        if (!ck) {
                            that.emit('prompt');
                        } else {
                            that.emit('connect');
                            that.saveKey(ck);
                            handshaken = true;
                        }
                    }

                    if (callbacks[message.id]) {
                        callbacks[message.id](null, message.payload);
                    }

                } catch (e) {
                    //console.log('<  ', message.utf8Data);
                }


            } else {
                //console.log('<  ', message.toString());
            }
        });

        handshaken = false;

        handshake.payload['client-key'] = that.key || undefined;

        //console.log("--> ", hs);
        connection.send(JSON.stringify(handshake));
    });

    this.request = function (uri, payload, cb) {
        this.send('request', uri, payload, cb);
    };

    this.subscribe = function (uri, payload, cb) {
        this.send('subscribe', uri, payload, cb);
    };

    this.send = function (type, uri, /* optional */ payload, /* optional */ cb) {
        if (typeof payload === 'function') {
            cb = payload;
            payload = {};
        }

        if (!clientconnection.connected) {
            return cb(new Error('not connected'));
        }

        var cid = getCid();

        var json = JSON.stringify({
            id: cid,
            type: type,
            uri: uri,
            payload: payload
        });

        //console.log('-->', json);

        if (typeof cb === 'function') {

            switch (type)  {
                case 'request':
                    callbacks[cid] = function (err, res) {
                        cb(err, res);
                        // remove callback after first call
                        delete callbacks[cid];
                    };

                    // set callback timeout
                    setTimeout(function () {
                        cb(new Error('timeout'));
                        // remove callback
                        delete callbacks[cid];
                    }, config.timeout);
                    break;

                case 'subscribe':
                    callbacks[cid] = cb;
                    break;

                default:
                    throw new Error('unknown type');
            }
        }
        clientconnection.send(json);
    };

    /**
     *      Connect to TV using a websocket url (eg "ws://192.168.0.100:3000")
     *
     */
    this.connect = function (host) {
        autoReconnect = !!config.reconnect;

        // if already connected, no need to connect again
        if (clientconnection.connected && handshaken) {
            return;
        }

        that.emit('connecting', host);

        // open websocket connection and perform handshake
        clientconnection = {};
        client.connect(host);
    };

    this.disconnect = function () {
        clientconnection.close();
        autoReconnect = false;
    };

    setTimeout(function () {
        that.connect(config.url);
    }, 0);
};

util.inherits(LGTV, EventEmitter);

module.exports = LGTV;