# LGTV.js

## Introduction

The LG Smart TV is a TV running WebOS, ie later 2014 or 2015 models.
Previous models used other protocols and won't work with this.

* Controlling the TV
  * finding the TV on your local network
  * establishing a connection, ie successful handshake
  * establishing control of input source, volume, etc

There is some useful information out there already:

* LG TV:
  * LG remote app on android store
    - sniff traffic on network as it interacts with TV
    - reverse engineer by downloading .apk, run dex2jar etc etc
  * LG remote app by third-party developers
      - https://github.com/CODeRUS/harbour-lgremote-webos
  * look through the open source SDK's and API's published by LG
      - https://github.com/ConnectSDK/Connect-SDK-Android-Core


# Communication overview

I recently bought a new TV, a LG 60LB870V, which is a 2014 TV running WebOS 1.x. To start with, here's how I started. The same day I got the TV, I ran `nmap` on the TV and `Wireshark` on the network the TV was connected to, with the following results.

```
Port Scanning host results
     Open TCP Port:     1061        
     Open TCP Port:     1424        
     Open TCP Port:     1900        ssdp
     Open TCP Port:     1970        
     Open TCP Port:     3000        ws
     Open TCP Port:     3001        wss
     Open TCP Port:     9955
     Open TCP Port:     9998        
     Open TCP Port:     18181       
     Open TCP Port:     36866
```

Through Wireshark, I saw the TV sending UDP:

  * SSDP (simple service discovery protocol) to `239.255.255.250:1900`, presenting several SSDP endpoints
  * `192.168.1.255:9956` and `224.0.0.113:9956`. Port `9956` and the contents show this
    is `alljoyn`-traffic, something I haven't encountered before but is a service
    discovery protocol of some kind according to Wikipedia. The addresses are multicast/broadcast.

In the TV menus I had also enabled `zeroconf` meaning I can now address the TV by an
address valid in the local network, by default `lgsmarttv.lan` which is found by mDNS. This setting
is, IIRC, under `Network/LG Connect Apps`.

The TV IP address can otherwise be found using SSDP; send this:

```
'M-SEARCH * HTTP/1.1\r\n'
'HOST: 239.255.255.250:1900\r\n'
'MX: 30\r\n'
'MAN: "ssdp:discover\r\n"'
'ST: urn:lge-com:service:webos-second-screen:1\r\n\r\n'
```

to `udp://239.255.255.250:1900`, then the TV will respond.
This may be an alternative schema: `urn:schemas-upnp-org:device:MediaRenderer:1`.

## Pairing and communication

Most of the communication is over websockets on port 3000, or 3001.

The application must pair with the TV in order to be allowed to control it.
The pairing handshake used here is a hardcoded handshake retrieved from another LG remote control application,
which in turn seems to have retrieved it from the official LG remote control app. No fields
can be changed or the handshake will fail, and only basic commands are allowed. The handshake
contains a base-64 signature, which if "debased" starts `{"algorithm":"RSA-SHA256","keyId":"test-signing-cert","signatureVersion":1}`.
This may just be a hash of the signature, perhaps in JSON format, but I haven't persued this further.

If the signing information is not included, or something is changed - thus invalidating the signing - the handshake will
still succeed, but some commands are not permitted (such as getting information about the TV software).

After the handshake, the rest of the communication stays over the same websocket socket. Data and commands are sent
in cleartext JSON format, eg

```
{"type":"response","id":"status_0","payload":{"scenario":"mastervolume_tv_speaker","active":false,"action":"requested","volume":0,"returnValue":true,"subscribed":true,"mute":false}}
```

The `type` is either (at least, there may be more),

* `request` - a single request, eg get volume
* `response` - response to a request, or subscription event
* `subscribe` - subscribe to a topic ie get notifications when something happens, eg channel is changed
* `unsubscribe` - unsubscribe a subscribed topic

The `id` is a concatenation of the command and a message counter, like so:

```
Request:
{"type":"request","id":"status_3", ...}

Response:
{"type":"response","id":"status_3", ...}
```

This is used so that a request can be matched with a response.
