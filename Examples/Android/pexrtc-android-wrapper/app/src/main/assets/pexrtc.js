/* global window, navigator, WebSocket, console, URL, setTimeout, setInterval, clearInterval, EventSource */

var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;

/*
License for Base64.js,
retrieved from https://code.google.com/p/javascriptbase64

Copyright (c) 2008 Fred Palmer fred.palmer_at_gmail.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
function StringBuffer()
{
    this.buffer = [];
}

StringBuffer.prototype.append = function append(string)
{
    this.buffer.push(string);
    return this;
};

StringBuffer.prototype.toString = function toString()
{
    return this.buffer.join("");
};

var Base64 =
{
    codex : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    encode : function (input)
    {
        var output = new StringBuffer();

        var enumerator = new Utf8EncodeEnumerator(input);
        while (enumerator.moveNext())
        {
            var chr1 = enumerator.current;

            enumerator.moveNext();
            var chr2 = enumerator.current;

            enumerator.moveNext();
            var chr3 = enumerator.current;

            var enc1 = chr1 >> 2;
            var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            var enc4 = chr3 & 63;

            if (isNaN(chr2))
            {
                enc3 = enc4 = 64;
            }
            else if (isNaN(chr3))
            {
                enc4 = 64;
            }

            output.append(this.codex.charAt(enc1) + this.codex.charAt(enc2) + this.codex.charAt(enc3) + this.codex.charAt(enc4));
        }

        return output.toString();
    },

    decode : function (input)
    {
        var output = new StringBuffer();

        var enumerator = new Base64DecodeEnumerator(input);
        while (enumerator.moveNext())
        {
            var charCode = enumerator.current;

            if (charCode < 128)
                output.append(String.fromCharCode(charCode));
            else if ((charCode > 191) && (charCode < 224))
            {
                enumerator.moveNext();
                var charCode2 = enumerator.current;

                output.append(String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)));
            }
            else
            {
                enumerator.moveNext();
                var charCode2 = enumerator.current;

                enumerator.moveNext();
                var charCode3 = enumerator.current;

                output.append(String.fromCharCode(((charCode & 15) << 12) | ((charCode2 & 63) << 6) | (charCode3 & 63)));
            }
        }

        return output.toString();
    }
};


function Utf8EncodeEnumerator(input)
{
    this._input = input;
    this._index = -1;
    this._buffer = [];
}

Utf8EncodeEnumerator.prototype =
{
    current: Number.NaN,

    moveNext: function()
    {
        if (this._buffer.length > 0)
        {
            this.current = this._buffer.shift();
            return true;
        }
        else if (this._index >= (this._input.length - 1))
        {
            this.current = Number.NaN;
            return false;
        }
        else
        {
            var charCode = this._input.charCodeAt(++this._index);

            // "\r\n" -> "\n"
            //
            if ((charCode == 13) && (this._input.charCodeAt(this._index + 1) == 10))
            {
                charCode = 10;
                this._index += 2;
            }

            if (charCode < 128)
            {
                this.current = charCode;
            }
            else if ((charCode > 127) && (charCode < 2048))
            {
                this.current = (charCode >> 6) | 192;
                this._buffer.push((charCode & 63) | 128);
            }
            else
            {
                this.current = (charCode >> 12) | 224;
                this._buffer.push(((charCode >> 6) & 63) | 128);
                this._buffer.push((charCode & 63) | 128);
            }

            return true;
        }
    }
};

function Base64DecodeEnumerator(input)
{
    this._input = input;
    this._index = -1;
    this._buffer = [];
}

Base64DecodeEnumerator.prototype =
{
    current: 64,

    moveNext: function()
    {
        if (this._buffer.length > 0)
        {
            this.current = this._buffer.shift();
            return true;
        }
        else if (this._index >= (this._input.length - 1))
        {
            this.current = 64;
            return false;
        }
        else
        {
            var enc1 = Base64.codex.indexOf(this._input.charAt(++this._index));
            var enc2 = Base64.codex.indexOf(this._input.charAt(++this._index));
            var enc3 = Base64.codex.indexOf(this._input.charAt(++this._index));
            var enc4 = Base64.codex.indexOf(this._input.charAt(++this._index));

            var chr1 = (enc1 << 2) | (enc2 >> 4);
            var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            var chr3 = ((enc3 & 3) << 6) | enc4;

            this.current = chr1;

            if (enc3 != 64)
                this._buffer.push(chr2);

            if (enc4 != 64)
                this._buffer.push(chr3);

            return true;
        }
    }
};
/* End of base64 code */

function t2b(text) {
    return text == "YES" || text == "ALLOW" ? true : false;
}

function b2t(val) {
    return val ? "YES" : "NO";
}
function b2p(val) {
    return val ? "ALLOW" : "DENY";
}

function PexRTCCall() {
    var self = this;

    self.state = 'IDLE';
    self.parent = null;
    self.bandwidth_in = 1280;
    self.bandwidth_out = 1280;
    self.localStream = null;
    self.onHold = false;
    self.pc = null;
    self.mutedAudio = false;
    self.mutedVideo = false;
    self.call_type = '';
    self.audio_source = null;
    self.video_source = null;
    self.recv_audio = true;
    self.recv_video = true;
    self.force_hd = 720;
    self.event_listener = null;
    self.call_uuid = null;
    self.legacy_screenshare = false;
    self.h264_enabled = true;
    self.allow_1080p = false;
    self.stream = null;
    self.presentation_in_main = false;
    self.ice_candidates = [];
    self.host_candidate = null;

    self.analyser = null;
    self.microphone = null;
    self.audioContext = null;
    self.audioRTCInterval = null;
    self.previousIceConnectionState = '';

    self.onError = null;
    self.onSetup = null;
    self.onConnect = null;
    self.onHoldResume = null;
    self.onDisconnect = null;
    self.onMicActivity = null;
    self.onScreenshareMissing = null;
}


PexRTCCall.prototype.sdpAddCandidates = function(sdplines) {
    var self = this;
    var newlines = [];

    for (var i = 0; i < sdplines.length; i++) {
        if (self.edge_ver < 14393 && (sdplines[i].lastIndexOf('m=', 0) === 0 || sdplines[i] === '')) {
            for (var j = 0; j < self.ice_candidates.length; j++) {
                if (self.ice_candidates[j].indexOf("endOfCandidates") === -1) {
                    newlines.push('a=' + self.ice_candidates[j]);
                }
            }
        }
        newlines.push(sdplines[i]);

        if (sdplines[i].indexOf('a=ssrc:') === 0 && sdplines[i].indexOf('cname:') > 0) {
            var ssrc = sdplines[i].substr(7, sdplines[i].indexOf(" ")-7);
            newlines.push('a=x-ssrc-range:' + ssrc + '-' + (parseInt(ssrc)+99));
        }
    }

    return newlines;
};

PexRTCCall.prototype.getHostCandidate = function(sdplines, start, port) {
    var self = this;

    var candidates = [];
    for (var i = start; i < sdplines.length; i++) {
        if (sdplines[i].lastIndexOf('a=candidate', 0) === 0 && sdplines[i].substr(-4) == 'host') {
            var fields = sdplines[i].split(' ');
            if (port && fields[5] != port) {
                continue;
            }
            candidates.push(fields[4] + ',' + fields[5]);
        }
    }

    if (candidates.length > 0) {
        if (self.host_candidate == null || !candidates.includes(self.host_candidate)) {
            // Prefer IPv4
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i].indexOf(':') == -1) {
                    self.host_candidate = candidates[i];
                    break;
                }
            }

            if (self.host_candidate == null) {
                self.host_candidate = candidates[0];
            }
        }

        return self.host_candidate.split(',');
    }
};

PexRTCCall.prototype.sdpAddPLI = function(sdplines) {
    var self = this;
    var state = 'notinvideo';
    var newlines = [];

    for (var i = 0; i < sdplines.length; i++) {
        var sdpline = sdplines[i];

        if (sdplines[i].lastIndexOf('c=', 0) === 0 && (sdplines[i].substr(-7) == '0.0.0.0' || self.firefox_ver > 0)) {
            var host = self.getHostCandidate(sdplines, i);
            if (host) {
                if (host[0].indexOf(':') > -1) {
                    sdpline = 'c=IN IP6 ' + host[0];
                } else {
                    sdpline = 'c=IN IP4 ' + host[0];
                }
            }
        } else if (sdplines[i].lastIndexOf('m=', 0) === 0 && (sdplines[i].split(' ')[1] == '9' || self.firefox_ver > 0)) {
            var fields = sdplines[i].split(' ');
            var host = self.getHostCandidate(sdplines, i, fields[1]) || self.getHostCandidate(sdplines, i);
            if (host) {
                fields[1] = host[1];
                sdpline = fields.join(' ');
            }
        }

        if (state === 'notinvideo') {
            newlines.push(sdpline);

            if (sdplines[i].lastIndexOf('m=video', 0) === 0) {
                state = 'invideo';
            }
        } else if (state === 'invideo') {
            if (sdplines[i].lastIndexOf('m=', 0) === 0 || sdplines[i] === '') {
                if (!(self.chrome_ver > 41 || self.firefox_ver > 44)) {
                    newlines.push('a=rtcp-fb:* nack pli');
                }

                if (self.call_type == 'presentation' || self.call_type == 'screen') {
                    newlines.push('a=content:slides');
                }

                if (sdplines[i].lastIndexOf('m=video', 0) !== 0) {
                    state = 'notinvideo';
                }
            }

            if ((!self.h264_enabled || self.call_type == 'screen') && sdplines[i].lastIndexOf('a=rtpmap:', 0) === 0 && sdplines[i].lastIndexOf('H264') > 0) {
                var fields = sdplines[i].split(' ');
                var pt = fields[0].substr(fields[0].indexOf(':')+1);
                while (sdplines[i+1].lastIndexOf('a=fmtp:' + pt, 0) === 0 || sdplines[i+1].lastIndexOf('a=rtcp-fb:' + pt, 0) === 0) {
                    i++;
                }
                continue;
            }

            newlines.push(sdpline);

            if (self.chrome_ver > 0 && (self.allow_1080p || self.call_type == 'presentation') && sdplines[i].lastIndexOf('a=rtpmap:', 0) === 0) {
                var fields = sdplines[i].split(' ');
                var pt = fields[0].substr(fields[0].indexOf(':')+1);
                if (sdplines[i].lastIndexOf('VP8') > 0) {
                    newlines.push('a=fmtp:' + pt + ' max-fs=8160;max-fr=30');
                } else if (sdplines[i].lastIndexOf('H264') > 0) {
                    while (sdplines[i+1].lastIndexOf('a=rtcp-fb:' + pt, 0) === 0) {
                        newlines.push(sdplines[++i]);
                    }
                    if (sdplines[i+1].lastIndexOf('a=fmtp:' + pt, 0) === 0 && sdplines[i+1].lastIndexOf('max-fs') === -1) {
                        newlines.push(sdplines[++i] + ';max-br=3732;max-mbps=245760;max-fs=8192;max-smbps=245760;max-fps=3000;max-fr=30');
                    }
                }
            }

            if (sdplines[i].lastIndexOf('c=', 0) === 0) {
                newlines.push('b=AS:' + self.bandwidth_in);
            }
        }
    }

    return newlines;
};

PexRTCCall.prototype.sdpChangeBW = function(sdplines) {
    var self = this;
    var state = 'notinvideo';
    var newlines = [];

    for (var i = 0; i < sdplines.length; i++) {
        newlines.push(sdplines[i]);
        if (sdplines[i].lastIndexOf('m=video', 0) === 0) {
            state = 'invideo';
        } else if (state === 'invideo') {
            if (sdplines[i].lastIndexOf('c=', 0) === 0) {
                if (sdplines[i+1].lastIndexOf('b=AS:', 0) === 0) {
                    var oldbw = sdplines[i+1];
                    oldbw = oldbw.substr(oldbw.indexOf(":")+1);
                    if (parseInt(oldbw) < self.bandwidth_out) {
                        self.bandwidth_out = oldbw;
                    }
                    i++;
                }
                if (sdplines[i+1].lastIndexOf('b=TIAS:', 0) === 0) {
                    i++;
                }
                newlines.push('b=AS:' + self.bandwidth_out);
                newlines.push('b=TIAS:' + (self.bandwidth_out * 1000));
            } else if (sdplines[i].lastIndexOf('m=', 0) === 0 || sdplines[i] === '') {
                if (sdplines[i].lastIndexOf('m=video', 0) !== 0) {
                    state = 'notinvideo';
                }
            }

        }
        if (navigator.userAgent.indexOf("Chrome") != -1 && sdplines[i].lastIndexOf('a=sendonly', 0) === 0) {
            newlines.push('a=sendrecv');
        }
    }

    return newlines;
};


PexRTCCall.prototype.makeCall = function (parent, call_type) {
    var self = this;

    if (self.state != 'UPDATING') {
        self.state = 'ACTIVE';
    }
    self.parent = parent;
    self.bandwidth_in = self.parent.bandwidth_in;
    self.bandwidth_out = self.parent.bandwidth_out;
    if (self.parent.set_bandwidth_in < self.bandwidth_in) {
         self.bandwidth_in = self.parent.set_bandwidth_in;
    }
    if (self.parent.set_bandwidth_out < self.bandwidth_out) {
         self.bandwidth_out = self.parent.set_bandwidth_out;
    }
    self.presentation_in_main = self.parent.presentation_in_main;
    self.legacy_screenshare = self.parent.screenshare_api === null;
    self.is_android = self.parent.is_android;
    self.firefox_ver = self.parent.firefox_ver;
    self.chrome_ver = self.parent.chrome_ver;
    self.edge_ver = self.parent.edge_ver;
    self.safari_ver = self.parent.safari_ver;
    self.h264_enabled = self.parent.h264_enabled;
    self.allow_1080p = self.parent.allow_1080p;
    if (self.allow_1080p) {
        self.force_hd = 1080;
    } else if (self.force_hd !== false) {
        self.force_hd = 720;
    }

    if (call_type == 'presentation') {
        self.call_type = call_type;
        self.audio_source = false;
        self.video_source = false;
        self.recv_audio = false;
    } else if (call_type == 'audioonly') {
        self.audio_source = self.parent.audio_source;
        self.recv_audio = self.parent.recv_audio;
        self.video_source = false;
        self.recv_video = false;
    } else if (call_type && call_type.indexOf('recvonly') === 0) {
        self.audio_source = false;
        self.video_source = false;
        if (call_type == 'recvonlyvideo') {
            self.recv_audio = false;
        }
    } else if (call_type == 'screen') {
        self.call_type = call_type;
        self.audio_source = false;
        self.recv_audio = false;
        self.recv_video = false;
        if (self.bandwidth_out < 384) {
            // Chrome does not support screensharing at under 384kbps
            self.bandwidth_out = 384;
        }
    } else {
        self.audio_source = self.parent.audio_source;
        self.video_source = self.parent.video_source;
        self.recv_audio = self.parent.recv_audio;
        self.recv_video = self.parent.recv_video;
    }

    if (call_type == 'screen' && self.chrome_ver >= 34 && !self.legacy_screenshare) {
        var pending = window.setTimeout(function() {
            /* var err = new Error('NavigatorUserMediaError');
            err.name = 'EXTENSION_UNAVAILABLE';
            self.gumError(err); */
            self.legacy_screenshare = true;
            self.getMedia();
        }, 2000);
        self.event_listener = function (event) {
            if (event.origin != window.location.origin) {
                return;
            }
            if (event.data.type == self.parent.screenshare_api + 'Done') {
                self.getMedia(event.data.sourceId);
            } else if (event.data.type == self.parent.screenshare_api + 'Pending') {
                window.clearTimeout(event.data.id);
            }
        };
        window.addEventListener('message', self.event_listener);
        window.postMessage({ type: self.parent.screenshare_api, id: +pending}, '*');
    } else {
        self.getMedia();
    }
};

PexRTCCall.prototype.sendRequest = function(request, params, cb, retries) {
    var self = this;

    // Only do async if explicitly asked
    var async = cb === false ? false : true;
    var xhr = new XMLHttpRequest();
    var xhrUrl = "https://" + self.parent.node + "/api/client/v2/conferences/" + self.parent.conference_uri + "/participants/" + self.parent.uuid + "/" + request;
    self.parent.onLog("PexRTCCall.sendRequest", request, params, xhrUrl);
    xhr.open("POST", xhrUrl, async);
    if (cb) {
        xhr.onload = cb;
    }
    if (retries === undefined) {
        retries = 0;
    }
    xhr.onerror = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Error sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, retries); }, retries * 500);
        }
    };
    xhr.ontimeout = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Timeout sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, retries); }, retries * 500);
        }
    };
    if (self.parent.token) {
        xhr.setRequestHeader('token', self.parent.token);
    }
    if (self.parent.basic_username && self.parent.basic_password) {
        xhr.setRequestHeader('Authorization', 'Basic ' + Base64.encode(self.parent.basic_username + ':' + self.parent.basic_password));
    }
    if (params) {
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(params));
    } else {
        xhr.send();
    }
    if (cb === false) {
        self.parent.onLog("PexRTCCall.sendRequest response", xhr.responseText);
        var msg = {};
        try {
            msg = JSON.parse(xhr.responseText);
        } catch (error) {
            msg.reason = xhr.status + " " + xhr.statusText;
        }
        msg.http_status = xhr.status;
        return msg;
    }
};

PexRTCCall.prototype.handleError = function (err) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        self.cleanup();
        if (self.onError) {
            if (self.call_type == 'presentation' || self.call_type == 'screen') {
                self.onError(err);
            } else {
                if (err.hasOwnProperty('message')) {
                    err = err.message;
                }
                self.onError(self.parent.trans.ERROR_CALL_FAILED + err);
            }
        }
    }
};

PexRTCCall.prototype.getMedia = function(sourceId) {
    var self = this;

    if (self.call_type == 'screen' && self.chrome_ver >= 34 && !self.legacy_screenshare) {
        if (sourceId) {
            self.video_source = sourceId;
        } else {
            return self.handleError(self.parent.trans.ERROR_SCREENSHARE_CANCELLED);
        }
    }

    if (self.localStream) {
        if (self.parent.return_media_stream) {
            return self.onSetup(self.localStream);
        } else {
            var url = window.URL || window.webkitURL || window.mozURL;
            return self.onSetup(url.createObjectURL(self.localStream));
        }
    }

    if (!self.localStream && !(self.audio_source === false && self.video_source === false)) {
        var audioConstraints = self.audio_source !== false;
        var videoConstraints = {};
        if (self.call_type == 'screen') {
            if (self.video_source) {
                videoConstraints.chromeMediaSource = 'desktop';
                videoConstraints.chromeMediaSourceId = self.video_source;
            } else {
                if (self.firefox_ver > 32) {
                    videoConstraints.mozMediaSource = self.call_type;
                    videoConstraints.mediaSource = self.call_type;
                } else {
                    videoConstraints.chromeMediaSource = self.call_type;
                    if (self.chrome_ver < 50) {
                        videoConstraints.googLeakyBucket = true;
                    }
                }
            }
            videoConstraints.maxWidth = self.parent.screenshare_width;
            videoConstraints.maxHeight = self.parent.screenshare_height;
            videoConstraints.maxFrameRate = self.parent.screenshare_fps.toString();
        } else if (self.firefox_ver > 43 || self.edge_ver > 10527) {
            videoConstraints.frameRate = {'ideal': 30, 'max': 30};
            if (self.force_hd > 0 && navigator.userAgent.indexOf('OS X') != -1) {
                videoConstraints.width = {'min': 1280};
                videoConstraints.height = {'min': 720};
                if (self.force_hd == 1080) {
                    videoConstraints.width.ideal = 1920;
                    videoConstraints.height.ideal = 1080;
                }
            } else {
                videoConstraints.width = {'ideal': 1280};
                videoConstraints.height = {'ideal': 720};
                if (self.force_hd == 1080) {
                    videoConstraints.width.max = 1920;
                    videoConstraints.height.max = 1080;
                }
            }
        } else if (self.chrome_ver > 56 && !self.is_android) {
            if (self.force_hd == 1080) {
                videoConstraints.width = {'min': 1920};
                videoConstraints.height = {'min': 1080};
                videoConstraints.frameRate = {'ideal': 30, 'max': 30};
            } else if (self.force_hd == 720) {
                videoConstraints.width = {'min': 1280};
                videoConstraints.height = {'min': 720};
                videoConstraints.frameRate = {'ideal': 30, 'max': 30};
            } else {
                videoConstraints.width = {'ideal': 1280};
                videoConstraints.height = {'ideal': 720};
            }
        } else if (self.safari_ver > 603) {
            if (self.force_hd == 1080) {
                videoConstraints.width = 1920;
                videoConstraints.height = 1080;
            } else if (self.force_hd == 720) {
                videoConstraints.width = 1280;
                videoConstraints.height = 720;
            }
        } else if (self.force_hd == 1080 && self.chrome_ver >= 34) {
            videoConstraints.minWidth = "1920";
            videoConstraints.minHeight = "1080";
        } else if (self.force_hd == 720) {
            videoConstraints.minWidth = "1280";
            videoConstraints.minHeight = "720";
        }

        if (self.chrome_ver >= 38 && self.chrome_ver < 49 && self.bandwidth_out > 384) {
            videoConstraints.googHighBitrate = true;
            if (self.bandwidth_out > 960) {
                videoConstraints.googVeryHighBitrate = true;
            }
        }

        if (self.audio_source && audioConstraints) {
            if ((self.chrome_ver > 56 && self.chrome_ver < 66 && !self.is_android) || self.firefox_ver > 43 || self.edge_ver > 10527) {
                audioConstraints = {'deviceId': self.audio_source};
            } else if (self.safari_ver > 603 || self.chrome_ver > 65) {
                audioConstraints = {'deviceId': {'exact': self.audio_source}};
            } else if (self.chrome_ver > 49) {
                audioConstraints = {'mandatory': {'sourceId': self.audio_source}, 'optional': []};
            } else {
                audioConstraints = {'optional': [{'sourceId': self.audio_source}]};
            }
        }

        if (self.chrome_ver >= 38 && self.chrome_ver < 57) {
            if (audioConstraints && !audioConstraints.optional) {
                audioConstraints = {'optional': []};
            }
            if (audioConstraints) {
                audioConstraints.optional.push({'googEchoCancellation': true});
                audioConstraints.optional.push({'googEchoCancellation2': true});
                audioConstraints.optional.push({'googAutoGainControl': true});
                audioConstraints.optional.push({'googAutoGainControl2': true});
                audioConstraints.optional.push({'googNoiseSuppression': true});
                audioConstraints.optional.push({'googNoiseSuppression2': true});
                audioConstraints.optional.push({'googHighpassFilter': true});
            }
        } else if (self.chrome_ver >= 57 && self.chrome_ver < 63) {
            if (audioConstraints === true) {
                audioConstraints = {'deviceId': 'default'};
            }
            if (audioConstraints) {
                audioConstraints['googEchoCancellation'] = true;
                audioConstraints['googExperimentalEchoCancellation'] = true;
                audioConstraints['googAutoGainControl'] = true;
                audioConstraints['googExperimentalAutoGainControl'] = true;
                audioConstraints['googNoiseSuppression'] = true;
                audioConstraints['googExperimentalNoiseSuppression'] = true;
                audioConstraints['googHighpassFilter'] = true;
                audioConstraints['googAudioMirroring'] = false;
            }
        }

        var constraints = { 'audio' : audioConstraints };

        if ((self.chrome_ver > 56 && self.call_type != 'screen' && !self.is_android) || self.firefox_ver > 32 || self.edge_ver > 10527 || self.safari_ver > 603) {
            constraints.video = videoConstraints;
        } else {
            constraints.video = { 'mandatory' : videoConstraints, 'optional' : [] };
        }

        if (self.video_source && self.call_type != 'screen') {
            if ((self.chrome_ver > 56 && self.chrome_ver < 66 && !self.is_android) || self.firefox_ver > 43 || self.edge_ver > 10527) {
                constraints.video.deviceId = self.video_source;
            } else if (self.safari_ver > 603 || self.chrome_ver > 65) {
                constraints.video.deviceId = {'exact': self.video_source};
            } else if (self.chrome_ver > 49) {
                constraints.video.mandatory.sourceId = self.video_source;
            } else {
                constraints.video.optional = [{'sourceId': self.video_source}];
            }
        }

        if (self.chrome_ver > 49 && self.chrome_ver < 57 && !self.call_type && self.parent.powerLineFrequency > 0) {
            constraints.video.optional.push({'googPowerLineFrequency': self.parent.powerLineFrequency});
        }

        if (self.video_source === false) {
            constraints.video = false;
        }

        self.parent.onLog("constraints", constraints);

        navigator.getMedia = ( navigator.getUserMedia ||
                               navigator.webkitGetUserMedia ||
                               navigator.mozGetUserMedia ||
                               navigator.msGetUserMedia);

        try {
            if (self.call_type !== 'screen' && self.parent && self.parent.user_media_stream) {
                self.gumSuccess(self.parent.user_media_stream);
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(constraints)
                                                    .then(function(stream) { self.gumSuccess(stream); })
                                                    .catch(function(err) { self.gumError(err); });
            } else if (navigator.getMedia) {
                navigator.getMedia(constraints,
                                   function(stream) { self.gumSuccess(stream); },
                                   function(err) { self.gumError(err); });
            } else {
                return self.handleError(self.parent.trans.ERROR_WEBRTC_SUPPORT);
            }
        } catch (error) {
            self.gumError(error);
        }
    } else {
        self.onSetup();
    }
};

PexRTCCall.prototype.gumSuccess = function (stream) {
    var self = this;

    self.localStream = stream;
    if (self.parent.return_media_stream) {
        self.onSetup(stream);
    } else {
        var url = window.URL || window.webkitURL || window.mozURL;
        self.onSetup(url.createObjectURL(stream));
    }

    var audioCtx = (window.AudioContext || window.webkitAudioContext || undefined);
    if (self.audio_source !== false && audioCtx !== undefined && audioCtx.prototype.createMediaStreamSource) {
        if (!self.audioContext) {
            self.audioContext = new audioCtx();
        }
        if (self.audioContext.resume) {
            self.audioContext.resume();
        }

        if (!self.analyser) {
            self.analyser = self.audioContext.createAnalyser();
        }
        self.microphone = self.audioContext.createMediaStreamSource(stream);

        self.analyser.smoothingTimeConstant = 0.1;
        self.analyser.fftSize = 512;
        self.microphone.connect(self.analyser);

        var audioProcess = function() {
            var array =  new Uint8Array(self.analyser.frequencyBinCount);
            self.analyser.getByteFrequencyData(array);
            var values = 0;

            var length = array.length;
            for (var i = 0; i < length; i++) {
                values += array[i];
            }

            var average = values / length;
            if (average > 70) {
                if (self.onMicActivity !== null) {
                    self.onMicActivity();
                }
            }
        };
        self.audioRTCInterval = setInterval(audioProcess, 250);
    }
};


PexRTCCall.prototype.gumError = function(err) {
    var self = this;

    self.parent.onLog("getUserMedia error", err);

    if (self.call_type == 'screen') {
        self.cleanup();
        if (self.chrome_ver >= 34) {
            if (err && err.name == 'TrackStartError') {
                self.handleError(self.parent.trans.ERROR_CONNECTING_SCREENSHARE);
            } else {
                self.onScreenshareMissing();
            }
        } else {
            self.handleError(self.parent.trans.ERROR_SCREENSHARE_CANCELLED);
        }
    } else if (self.force_hd == 1080) {
        self.force_hd = 720;
        return self.getMedia();
    } else if (self.force_hd == 720) {
        self.force_hd = 0;
        return self.getMedia();
    } else {
        if (self.parent.event_error) {
            self.parent.event_error(self.pc, self.parent.conference, 'getUserMedia', err);
        }
        if (err) {
            self.parent.error = err.name;
        }
        self.handleError(self.parent.trans.ERROR_USER_MEDIA);
    }
};

PexRTCCall.prototype.connect = function() {
    var self = this;

    if (self.state != 'UPDATING') {
        if ('iceServers' in self.parent.pcConfig) {
            self.pc = new PeerConnection(self.parent.pcConfig);
        } else {
            self.pc = new PeerConnection(null);
        }
    }

    self.pc.onicecandidate = function(evt) { self.pcIceCandidate(evt); };
    self.pc.oniceconnectionstatechange = function(evt) { self.pcIceConnectionStateChanged(evt); };
    //pc.onnegotiationneeded = this.pcNegotiationNeeded;
    if (self.firefox_ver > 52 || self.safari_ver > 603) {
        self.pc.ontrack = function(evt) { self.pcAddStream(evt.streams); }
    } else {
        self.pc.onaddstream = function(evt) { self.pcAddStream([evt.stream]); };
    }
    //pc.onremovestream = this.pcRemoveStream;
    //pc.onsignalingstatechange = this.pcSignalingStateChange;

    if (self.call_type == 'screen') {
        var screenshareEnded = function() {
            self.disconnect();
            self.onDisconnect(self.parent.trans.ERROR_PRESENTATION_ENDED);
        };
        if (self.chrome_ver > 34 && self.chrome_ver < 50) {
            self.localStream.onended = screenshareEnded;
        } else {
            self.localStream.oninactive = screenshareEnded;
        }
    }

    if (self.localStream) {
        if (self.state == 'UPDATING' && (self.firefox_ver > 58)) {
            self.pc.getSenders()[0].replaceTrack(self.localStream.getTracks()[0]);
            self.pc.getSenders()[1].replaceTrack(self.localStream.getTracks()[1]);
            return self.ackReceived();
        } else if (self.pc.addStream) {
            self.pc.addStream(self.localStream);
        } else if (self.pc.addTrack) {
            var tracks = self.localStream.getTracks();
            for (var i=0;i<tracks.length;i++) {
                self.pc.addTrack(tracks[i], self.localStream);
            }
        }
    }

    if (self.mutedAudio) {
        self.mutedAudio = false;
        self.muteAudio(true);
    }
    if (self.mutedVideo) {
        self.mutedVideo = false;
        self.muteVideo(true);
    }

    if (self.parent.event_newPC) {
        self.parent.event_newPC(self.pc, self.parent.uuid, self.parent.conference, self.call_type, function() { self.pcCreateOffer(); });
    }
    self.pcCreateOffer();
};

PexRTCCall.prototype.pcCreateOffer = function() {
    var self = this;

    var constraints = {};
    if (self.chrome_ver > 49 || self.firefox_ver > 42 || self.edge_ver > 10527 || self.safari_ver > 603) {
        constraints =  { 'offerToReceiveAudio': self.recv_audio, 'offerToReceiveVideo': self.recv_video };
    } else {
        constraints =  { 'mandatory': { 'OfferToReceiveAudio': self.recv_audio, 'OfferToReceiveVideo': self.recv_video } };
    }

    setTimeout(function() {
        if (self.state == 'ACTIVE') {
            self.state = 'CONNECTING';
            self.parent.onLog("Timed out gathering candidates", self.pc.localDescription.sdp);
            if (self.ice_candidates.length == 0) {
                self.parent.onLog("No ICE candidates were gathered.");
                self.parent.error = "Timed out gathering candidates";
                self.handleError(self.parent.trans.ERROR_ICE_CANDIDATES);
            } else {
                self.pcOfferCreated(self.pc.localDescription);
            }
        }}, 10000);

    if (self.safari_ver > 604) {
        self.pc.createOffer(constraints)
                            .then(function(sdp) { self.pcOfferCreated(sdp); })
                            .catch(function(err) {
                                if (self.parent.event_error) {
                                    self.parent.event_error(self.pc, self.parent.conference, 'createOffer', err, self.pc.localDescription);
                                }
                                self.handleError(err);
                            });
    } else {
        self.pc.createOffer(function(sdp) { self.pcOfferCreated(sdp); },
                            function(err) {
                                if (self.parent.event_error) {
                                    self.parent.event_error(self.pc, self.parent.conference, 'createOffer', err, self.pc.localDescription);
                                }
                                self.handleError(err);
                            },
                            constraints);
    }
};

PexRTCCall.prototype.pcIceCandidate = function (evt) {
    var self = this;

    // Do not gather candidates again
    if (self.state == 'UPDATING') {
        return;
    }

    self.parent.onLog("Ice Gathering State", self.pc.iceGatheringState);
    if (evt.candidate) {
        self.parent.onLog("Gathered ICE candidate", evt.candidate.candidate);
        self.ice_candidates.push(evt.candidate.candidate);
    } else if (self.pc.iceGatheringState == "complete") {
        if (self.state == 'ACTIVE') {
            self.state = 'CONNECTING';
            self.parent.onLog("Finished gathering candidates", self.pc.localDescription.sdp);
            if (self.ice_candidates.length == 0) {
                self.parent.onLog("No ICE candidates were gathered.");
                self.parent.error = "No ICE candidates were gathered.";
                self.handleError(self.parent.trans.ERROR_ICE_CANDIDATES);
            } else {
                setTimeout(function() {
                    self.pcOfferCreated(self.pc.localDescription);
                }, 200);
            }
        }
    }
};

PexRTCCall.prototype.pcIceConnectionStateChanged = function (evt) {
    var self = this;

    self.parent.onLog("Ice Connection State", self.pc.iceConnectionState);
    if (self.pc.iceConnectionState == 'failed' && self.state == 'CONNECTED') {
        if (self.previousIceConnectionState == 'checking') {
            self.parent.error = "ICE Failed at start of call.";
            self.disconnect();
            self.onError(self.parent.trans.ERROR_ICE_FAILED);
        } else if (self.chrome_ver > 0) {
            self.parent.error = "ICE Failed mid-call.";
            self.disconnect();
            self.onError(self.parent.trans.ERROR_CONNECTING);
        }
    }
    self.previousIceConnectionState = self.pc.iceConnectionState;
};

PexRTCCall.prototype.mutateOffer = function(description) {
    var self = this;
    var lines = description.sdp.split('\r\n');
    if (self.edge_ver > 10527) {
        lines = self.sdpAddCandidates(lines);
    }
    lines = self.sdpAddPLI(lines);

    var sdp = lines.join('\r\n');
    self.parent.onLog("Mutated offer", sdp);

    return new SessionDescription({ 'type' : 'offer', 'sdp' : sdp });
};


PexRTCCall.prototype.pcAddStream = function(streams) {
    var self = this;

    for (var i = 0; i < streams.length; i++) {
        self.parent.onLog("Stream added", streams[i].id);
        if (self.recv_audio === false && self.recv_video === false && self.localStream) {
            self.stream = self.localStream;
        } else {
            self.stream = streams[i];
        }
        if (self.state == 'CONNECTED' || self.state == 'UPDATING') {
            if (self.parent.return_media_stream) {
                self.onConnect(self.stream, self.call_uuid);
            } else {
                var url = window.URL || window.webkitURL || window.mozURL;
                self.onConnect(url.createObjectURL(self.stream), self.call_uuid);
            }
        }
        self.state = 'CONNECTED';
    }
};

PexRTCCall.prototype.pcOfferCreated = function(sdp) {
    var self = this;

    self.parent.onLog("Created offer", sdp.sdp);
    self.pc.setLocalDescription(sdp,
                        function () { self.parent.onLog("Local description active"); },
                        function (err) {
                            if (self.parent.event_error) {
                                self.parent.event_error(self.pc, self.parent.conference, 'setLocalDescription', err, sdp);
                            }
                            self.parent.onLog("Local description failed", err);
                        }
                       );

    if (self.state == 'CONNECTING' || self.state == 'UPDATING') {
        var mutatedOffer = {'call_type' : 'WEBRTC', 'sdp' : self.mutateOffer(sdp).sdp};
        if (self.call_type == 'screen') {
            mutatedOffer.present = 'send';
        } else if (self.call_type == 'presentation') {
            mutatedOffer.present = 'receive';
        } else if (self.presentation_in_main) {
            mutatedOffer.present = 'main';
        }
        var request = self.state == 'UPDATING' ? 'calls/' + self.call_uuid + '/update' : 'calls';
        self.sendRequest(request, mutatedOffer, function(e) {
            self.processAnswer(e);
        });
    }
};

PexRTCCall.prototype.remoteDescriptionActive = function() {
    var self = this;

    self.parent.onLog("Remote description active");
    if (self.recv_audio === false && self.recv_video === false && self.chrome_ver > 47 && self.localStream) {
        self.pcAddStream([self.localStream]);
    }
    self.sendRequest('calls/' + self.call_uuid + '/ack', null, function() { self.ackReceived(); });
};

PexRTCCall.prototype.ackReceived = function() {
    var self = this;

    if (self.firefox_ver > 43 && self.call_type == 'screen' && !self.stream) {
        // Firefox does not add a stream/track for outbound screensharing
        self.onConnect(null, self.call_uuid);
    } else if (self.state == 'CONNECTED' || self.state == 'UPDATING') {
        if (self.parent.return_media_stream) {
          self.onConnect(self.stream, self.call_uuid);
        } else {
            var url = window.URL || window.webkitURL || window.mozURL;
            self.onConnect(url.createObjectURL(self.stream), self.call_uuid);
        }
    }
    self.state = 'CONNECTED';
};

PexRTCCall.prototype.processAnswer = function(e) {
    var self = this;

    var msg;
    try {
        msg = JSON.parse(e.target.responseText);
    } catch (SyntaxError) {
        return self.handleError("Unexpected Response: " + e.target.status + " " + e.target.statusText);
    }
    if (e.target.status != 200) {
        return self.handleError(msg.result || msg.reason);
    }

    self.parent.onLog("Received answer", msg.result);
    if (msg.result.call_uuid) {
        self.call_uuid = msg.result.call_uuid;
    }

    if (self.state != 'DISCONNECTING') {
        var lines;
        if (msg.result.sdp) {
            lines = msg.result.sdp.split('\r\n');
        } else {
            lines = msg.result.split('\r\n');
        }
        lines = self.sdpChangeBW(lines);

        var sdp = lines.join('\r\n');
        self.parent.onLog("Mutated answer", sdp);

        if (self.safari_ver > 604) {
            self.pc.setRemoteDescription(new SessionDescription({ 'type' : 'answer', 'sdp' : sdp }))
                            .then(function () { self.remoteDescriptionActive(); })
                            .catch(function (err) {
                                if (self.parent.event_error) {
                                    self.parent.event_error(self.pc, self.parent.conference, 'setRemoteDescription', err, sdp);
                                }
                                self.parent.onLog("Remote description failed", err);
                                self.handleError(err.message);
                            });
        } else {
            self.pc.setRemoteDescription(new SessionDescription({ 'type' : 'answer', 'sdp' : sdp }),
                            function () {
                                          if (self.edge_ver > 10527 && self.edge_ver <= 14393) {
                                              self.sdpIceCandidates(lines);
                                          }
                                          self.remoteDescriptionActive();
                                        },
                            function (err) {
                                if (self.parent.event_error) {
                                    self.parent.event_error(self.pc, self.parent.conference, 'setRemoteDescription', err, sdp);
                                }
                                self.parent.onLog("Remote description failed", err);
                                self.handleError(err.message);
                            });
        }
    }
};

PexRTCCall.prototype.sdpIceCandidates = function(sdplines) {
    var self = this;
    var mLine = -1;
    var candidate;

    for (var i = 0; i < sdplines.length; i++) {
        if (sdplines[i].lastIndexOf('a=candidate', 0) === 0) {
            candidate = {'sdpMLineIndex' : mLine, 'candidate' : sdplines[i].substr(2)};
            self.pc.addIceCandidate(candidate);
        } else if (sdplines[i].lastIndexOf('m=', 0) === 0 || sdplines[i] === '') {
            if (mLine > -1) {
                candidate = {'sdpMLineIndex' : mLine, 'candidate' : 'candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates'};
                self.pc.addIceCandidate(candidate);
            }
            mLine++;
        }
    }
};

PexRTCCall.prototype.remoteDisconnect = function(msg) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        self.cleanup();

        var reason;
        if (self.call_type == 'presentation') {
            reason = self.parent.trans.ERROR_DISCONNECTED_PRESENTATION;
            if ('reason' in msg) {
                reason += ": " + msg.reason;
            }
        } else if (self.call_type == 'screen') {
            reason = self.parent.trans.ERROR_DISCONNECTED_SCREENSHARE;
            if ('reason' in msg) {
                reason += ": " + msg.reason;
            }
        } else if ('reason' in msg) {
            reason = msg.reason;
        } else {
            reason = self.parent.trans.ERROR_DISCONNECTED;
        }

        self.onDisconnect(reason);
    }
};

PexRTCCall.prototype.muteAudio = function(setting) {
    //mutedAudio is a toggle, opposite to enabled value, so toggle at end
    var self = this;

    if (setting === self.mutedAudio) {
        return self.mutedAudio;
    }

    if (self.pc && self.firefox_ver > 47) {
        var senders = self.pc.getSenders();
        for (var i=0; i<senders.length; i++) {
            if (senders[i].track.kind == 'audio') {
                senders[i].track.enabled = self.mutedAudio;
            }
        }
    } else {
        var streams = [];
        if (self.pc) {
            streams = self.pc.getLocalStreams();
        } else if (self.localStream) {
            streams = [self.localStream];
        }

        for (var i=0; i<streams.length; i++) {
            var tracks = streams[i].getAudioTracks();
            for (var j=0; j<tracks.length; j++) {
                tracks[j].enabled = self.mutedAudio;
            }
        }
    }
    self.mutedAudio = !self.mutedAudio;

    if (self.parent.event_event) {
        self.parent.event_event(self.pc, self.parent.conference, self.mutedAudio ? 'audioMute' : 'audioUnmute');
    }

    return self.mutedAudio;
};

PexRTCCall.prototype.update = function(call_type) {
    var self = this;

    if (self.state == 'CONNECTED') {
        self.state = 'UPDATING';
        self.cleanupAudioContext();
        if (self.safari_ver > 603 && self.stream) {
            var tracks = self.stream.getTracks();
            for (var i=0; i<tracks.length; i++) {
                tracks[i].stop();
                self.stream.removeTrack(tracks[i]);
            }
        }

        if (self.localStream) {
            var tracks = self.localStream.getTracks();
            for (var i=0;i<tracks.length;i++) {
                tracks[i].stop();
                self.localStream.removeTrack(tracks[i]);
            }
            self.localStream = undefined;
            if (self.firefox_ver > 47 || self.safari_ver > 603) {
                var senders = self.pc.getSenders();
                for (var i=0; i<senders.length; i++) {
                    self.pc.removeTrack(senders[i]);
                }
            } else {
                var streams = self.pc.getLocalStreams();
                for (var i=0; i<streams.length; i++) {
                    self.pc.removeStream(streams[i]);
                }
            }
        }

        self.makeCall(self.parent, call_type);
    }
};

PexRTCCall.prototype.muteVideo = function(setting) {
    var self = this;

    if (setting === self.mutedVideo) {
        return self.mutedVideo;
    }

    if (self.pc && self.firefox_ver > 47) {
        var senders = self.pc.getSenders();
        for (var i=0; i<senders.length; i++) {
            if (senders[i].track.kind == 'video') {
                senders[i].track.enabled = self.mutedVideo;
            }
        }
    } else {
        var streams = [];
        if (self.pc) {
            streams = self.pc.getLocalStreams();
        } else if (self.localStream) {
            streams = [self.localStream];
        }

        for (var i=0; i<streams.length; i++) {
            var tracks = streams[i].getVideoTracks();
            for (var j=0; j<tracks.length; j++) {
                tracks[j].enabled = self.mutedVideo;
            }
        }
    }
    self.mutedVideo = !self.mutedVideo;

    if (self.parent.event_event) {
        self.parent.event_event(self.pc, self.parent.conference, self.mutedVideo ? 'videoPause' : 'videoResume');
    }

    return self.mutedVideo;
};

PexRTCCall.prototype.holdresume = function(setting) {
    var self = this;

    self.onHold = setting;
    setting = !setting;
    var streams = self.pc.getLocalStreams().concat(self.pc.getRemoteStreams());
    for (var i=0; i<streams.length; i++) {
        var tracks = streams[i].getAudioTracks().concat(streams[i].getVideoTracks());
        for (var j=0; j<tracks.length; j++) {
            tracks[j].enabled = setting;
        }
    }

    if (self.parent.event_event) {
        self.parent.event_event(self.pc, self.parent.conference, self.onHold ? 'fabricHold' : 'fabricResume');
    }

    if (self.mutedAudio) {
        self.mutedAudio = false;
        self.muteAudio();
    }
    if (self.mutedVideo) {
        self.mutedVideo = false;
        self.muteVideo();
    }
};

PexRTCCall.prototype.disconnect = function(cb, save_call) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        self.parent.onLog('Sending disconnect');
        if (self.parent.token) {
            self.sendRequest('calls/' + self.call_uuid + '/disconnect', {}, cb);
        }
    }
    if (!save_call) {
        self.cleanup();
    }
};

PexRTCCall.prototype.cleanupAudioContext = function() {
    var self = this;

    if (self.audioContext && self.microphone && self.analyser) {
        try {
            self.microphone.disconnect(self.analyser);
            if (self.audioRTCInterval) {
                clearInterval(self.audioRTCInterval);
                self.audioRTCInterval = null;
            }
        } catch (e) {
            console.error("Unable to disconnect audio context", e);
        }
    }

    self.analyser = null;
    self.microphone = null;

    if (self.audioContext && self.audioContext.close) {
        self.audioContext.close();
        self.audioContext = null;
    } else if (self.audioContext && self.audioContext.suspend) {
        self.audioContext.suspend();
    }
};

PexRTCCall.prototype.cleanup = function() {
    var self = this;

    self.cleanupAudioContext();

    if (self.event_listener) {
        window.removeEventListener('message', self.event_listener);
        self.event_listener = null;
    }

    if (self.localStream) {
        self.parent.onLog("Releasing user media");
        if (self.call_type === 'screen' || (self.parent && !self.parent.user_media_stream)) {
            var tracks = self.localStream.getTracks();
            for (var i=0;i<tracks.length;i++) {
                tracks[i].stop();
            }
        }
        self.localStream = null;
    }

    if (self.pc && self.pc.signalingState != 'closed') {
        self.pc.close();
    }

    if (self.parent.event_event) {
        self.parent.event_event(self.pc, self.parent.conference, 'fabricTerminated');
    }
};

function PexJPEGPresentation() {
    var self = this;
    self.state = 'IDLE';
    self.parent = null;
    self.call_uuid = null;

    self.onError = null;
    self.onSetup = null;
    self.onConnect = null;
    self.onDisconnect = null;
}

PexJPEGPresentation.prototype.makeCall = function (parent) {
    var self = this;
    self.parent = parent;
    self.onSetup(self);
};

PexJPEGPresentation.prototype.connect = function () {
    var self = this;

    self.state = 'CONNECTING';
    var callRequest = {'call_type' : 'presentation'};
    self.sendRequest('participants/' + self.parent.uuid + '/calls', callRequest, function(e) {
        self.processAnswer(e);
    });
};

PexJPEGPresentation.prototype.processAnswer = function(e) {
    var self = this;

    var msg;
    try {
        msg = JSON.parse(e.target.responseText);
    } catch (SyntaxError) {
        return self.handleError("Unexpected Response: " + e.target.status + " " + e.target.statusText);
    }
    if (e.target.status != 200) {
        return self.handleError(msg.result || msg.reason);
    }

    self.state = 'CONNECTED';
    self.onConnect({});
    self.parent.onLog(msg.result);
    self.call_uuid = msg.result.call_uuid;
};

PexJPEGPresentation.prototype.sendRequest = function(request, params, cb, files, retries) {
    var self = this;

    // Only do async if explicitly asked
    var async = cb === false ? false : true;
    var xhr = new XMLHttpRequest();
    var xhrUrl = "https://" + self.parent.node + "/api/client/v2/conferences/" + self.parent.conference_uri + "/" + request;
    self.parent.onLog("PexJPEGPresentation.sendRequest", request, params, files, xhrUrl);
    xhr.open("POST", xhrUrl, async);
    if (cb) {
        xhr.onload = cb;
    }
    if (retries === undefined) {
        retries = 0;
    }
    xhr.onerror = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Error sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, files, retries); }, retries * 500);
        }
    };
    xhr.ontimeout = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Timeout sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, files, retries); }, retries * 500);
        }
    };
    if (self.parent.token) {
        xhr.setRequestHeader('token', self.parent.token);
    }
    if (self.parent.basic_username && self.parent.basic_password) {
        xhr.setRequestHeader('Authorization', 'Basic ' + Base64.encode(self.parent.basic_username + ':' + self.parent.basic_password));
    }
    if (params) {
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(params));
    } else if (files) {
        xhr.send(files);
    } else {
        xhr.send();
    }
    if (cb === false) {
        self.parent.onLog("PexJPEGPresentation.sendRequest response", xhr.responseText);
        var msg = {};
        try {
            msg = JSON.parse(xhr.responseText);
        } catch (error) {
            msg.reason = xhr.status + " " + xhr.statusText;
        }
        msg.http_status = xhr.status;
        return msg;
    }
};

PexJPEGPresentation.prototype.sendPresentationImageFile = function(file_element) {
    var self = this;
    if (!file_element || !file_element.files.length) {
        self.parent.onLog("PexJPEGPresentation.sendPresentationImageFile error:", "Element not given");
    }
    self.sendPresentationImage(file_element.files[0]);
};

PexJPEGPresentation.prototype.sendPresentationImage = function(image) {
    var self = this;
    var blob = new Blob([image], {"type": "image/jpeg"});
    var formdata = new FormData();
    formdata.append("frame", blob);
    self.parent.onLog("PexJPEGPresentation.sendPresentationImage", formdata);
    self.sendRequest('presentation', null, function() {}, formdata);
};

PexJPEGPresentation.prototype.remoteDisconnect = function(msg) {
    var self = this;

    var reason = self.parent.trans.ERROR_DISCONNECTED_SCREENSHARE;
    if ('reason' in msg) {
        reason = msg.reason;
    }
    self.onDisconnect(reason);
};

PexJPEGPresentation.prototype.disconnect = function() {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        if (self.parent.token) {
            self.sendRequest('participants/' + self.parent.uuid + '/calls/' + self.call_uuid + '/disconnect', false);
            self.onDisconnect(self.parent.trans.ERROR_PRESENTATION_ENDED);
        }
    }
};

PexJPEGPresentation.prototype.handleError = function (err) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        if (self.onError) {
            self.onError(err);
        }
        // Needed? Same behaviour as Screen presentation
        if (self.onDisconnect) {
            self.onDisconnect(self.parent.trans.ERROR_PRESENTATION_ENDED);
        }
    }
};

function PexRTMP(flash) {
    var self = this;

    self.state = 'IDLE';
    self.parent = null;
    self.flash = flash;
    self.call_uuid = null;
    self.mutedAudio = false;
    self.mutedVideo = false;
    self.audio_source = null;
    self.video_source = null;
    self.recv_audio = true;
    self.recv_video = true;
    self.mutedAudio = false;
    self.mutedVideo = false;
    self.call_type = '';
    self.presentation_in_main = false;

    self.onError = null;
    self.onSetup = null;
    self.onConnect = null;
}

PexRTMP.prototype.toggleSelfview = function() {
    var self = this;
    self.parent.onLog('PexRTMP.toggleSelfview', self.flash);
    self.flash.toggleSelfview();
};

PexRTMP.prototype.makeCall = function (parent, call_type) {
    var self = this;

    window.PexFlashEvents = new PexFlashEventsClass(self);
    self.state = 'ACTIVE';
    self.parent = parent;
    self.bandwidth_in = self.parent.bandwidth_in;
    self.bandwidth_out = self.parent.bandwidth_out;
    self.presentation_in_main = self.parent.presentation_in_main;
    if (self.flash) {
        self.flash = swfobject.getObjectById(self.flash.id);
    }

    if (call_type == 'presentation') {
        self.call_type = call_type;
        self.audio_source = false;
        self.video_source = false;
        self.recv_audio = false;
    } else if (call_type == 'audioonly') {
        self.video_source = false;
        self.recv_video = false;
        self.call_type = call_type;
    } else if (call_type && call_type.indexOf('recvonly') === 0) {
        self.audio_source = false;
        self.video_source = false;
        if (call_type == 'recvonlyvideo') {
            self.recv_audio = false;
        }
    } else if (call_type == 'screen') {
        self.handleError("Screensharing not supported");
    } else {
        self.audio_source = self.parent.audio_source;
        self.video_source = self.parent.video_source;
        self.recv_audio = self.parent.recv_audio;
        self.recv_video = self.parent.recv_video;
        if (call_type == 'stream') {
            self.call_type = call_type;
        }
    }

    if (self.onSetup) {
        self.onSetup();
    } else {
        self.connect();
    }
};

PexRTMP.prototype.connect = function () {
    var self = this;

    self.state = 'CONNECTING';
    var callRequest = {'call_type' : 'RTMP', 'bandwidth' : self.bandwidth_in };
    if (self.call_type == 'stream') {
        callRequest.streaming = 'true';
    }
    if (self.call_type == 'presentation') {
        callRequest.present = 'receive';
    } else if (self.presentation_in_main) {
        callRequest.present = 'main';
    }
    if (self.call_type == 'audioonly') {
        callRequest.audioonly = 'true';
    }
    self.sendRequest('calls', callRequest, function(e) {
        self.processAnswer(e);
    });
};

PexRTMP.prototype.processAnswer = function(e) {
    var self = this;

    var msg;
    try {
        msg = JSON.parse(e.target.responseText);
    } catch (SyntaxError) {
        return self.handleError("Unexpected Response: " + e.target.status + " " + e.target.statusText);
    }
    if (e.target.status != 200) {
        return self.handleError(msg.result || msg.reason);
    }

    self.state = 'CONNECTED';
    // Extract and remove /uuid from rtmp url's
    // Format: rtmp(s)://host:port/application/uuid
    // where uuid = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (length 36)
    var uuid = msg.result.url.substr(msg.result.url.length - 36, 36);
    console.log('UUID', uuid);
    var rtmp_url = msg.result.url.substr(0, msg.result.url.length - 37);
    console.log('rtmp_url', rtmp_url);
    var rtmps_url = '';
    if (msg.result.secure_url) {
        rtmps_url = msg.result.secure_url.substr(0, msg.result.secure_url.length - 37);
        console.log('rtmps_url', rtmps_url);
    }

    self.call_type = msg.result.call_type;
    self.call_uuid = msg.result.call_uuid;

    if (self.flash) {
        self.flash.startCall(rtmps_url, rtmp_url, uuid, self.parent.display_name, self.bandwidth_out,
                             self.audio_source, self.video_source, self.call_type == 'audioonly');
    }

    if (self.call_type == 'stream') {
        remoteServiceUri += '-stream';
    }

    //self.onConnect(remoteServiceUri);
};

PexRTMP.prototype.sendRequest = function(request, params, cb, retries) {
    var self = this;

    // Only do async if explicitly asked
    var async = cb === false ? false : true;
    var xhr = new XMLHttpRequest();
    var xhrUrl = "https://" + self.parent.node + "/api/client/v2/conferences/" + self.parent.conference_uri + "/participants/" + self.parent.uuid + "/" + request;
    self.parent.onLog("PexRTMP.sendRequest", request, params, xhrUrl);
    xhr.open("POST", xhrUrl, async);
    if (cb) {
        xhr.onload = cb;
    }
    if (retries === undefined) {
        retries = 0;
    }
    xhr.onerror = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Error sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, retries); }, retries * 500);
        }
    };
    xhr.ontimeout = function() {
        if (++retries > 10 || cb === false) {
            self.parent.error = "Timeout sending request: " + request;
            self.onError(self.parent.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, retries); }, retries * 500);
        }
    };
    if (self.parent.token) {
        xhr.setRequestHeader('token', self.parent.token);
    }
    if (self.parent.basic_username && self.parent.basic_password) {
        xhr.setRequestHeader('Authorization', 'Basic ' + Base64.encode(self.parent.basic_username + ':' + self.parent.basic_password));
    }
    if (params) {
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(params));
    } else {
        xhr.send();
    }
    if (cb === false) {
        self.parent.onLog("PexRTMP.sendRequest response", xhr.responseText);
        var msg = {};
        try {
            msg = JSON.parse(xhr.responseText);
        } catch (error) {
            msg.reason = xhr.status + " " + xhr.statusText;
        }
        msg.http_status = xhr.status;
        return msg;
    }
};

PexRTMP.prototype.disconnect = function(cb) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        self.parent.onLog('Sending disconnect');
        if (self.parent.token) {
            self.sendRequest('calls/' + self.call_uuid + '/disconnect', {}, cb);
        }
        if (self.flash) {
            self.flash.close();
        }
    }
};

PexRTMP.prototype.handleError = function (err) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';
        if (self.onError) {
            if (self.call_type == 'presentation' || self.call_type == 'screen') {
                self.onError(err);
            } else {
                if (err.hasOwnProperty('message')) {
                    err = err.message;
                }
                self.onError(self.parent.trans.ERROR_CALL_FAILED + err);
            }
        }
    }
};

PexRTMP.prototype.remoteDisconnect = function(msg) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        self.state = 'DISCONNECTING';

        var reason;
        if (self.call_type == 'presentation') {
            reason = self.parent.trans.ERROR_DISCONNECTED_PRESENTATION;
        } else if (self.call_type == 'screen') {
            reason = self.parent.trans.ERROR_DISCONNECTED_SCREENSHARE;
        } else {
            reason = self.parent.trans.ERROR_DISCONNECTED;
        }
        if ('reason' in msg) {
            reason = msg.reason;
        }

        self.onDisconnect(reason);
    }
};

PexRTMP.prototype.muteAudio = function(setting) {
    var self = this;

    if (setting === undefined) {
        self.mutedAudio = self.flash.toggleMuteAudio();
        return self.mutedAudio;
    } else {
        self.mutedAudio = setting;
        return self.flash.setMuteAudio(setting);
    }
};

PexRTMP.prototype.muteVideo = function(setting) {
    var self = this;

    if (setting === undefined) {
        self.mutedVideo = self.flash.toggleMuteVideo();
        return self.mutedVideo;
    } else {
        self.mutedVideo = setting;
        return self.flash.setMuteVideo(setting);
    }
};

PexRTMP.prototype.getMediaStatistics = function() {
    var self = this;

    return self.flash.getMediaStatistics();
};

function PexRTC() {
    var self = this;
    self.state = 'IDLE';
    self.conference = null;
    self.conference_uri = '';
    self.role = null;
    self.version = null;
    self.display_name = null;
    self.bandwidth_in = 1280;
    self.bandwidth_out = 1280;
    self.oneTimeToken = null;
    self.conference_extension = null;
    self.localStream = null;
    self.node = null;
    self.socket = null;
    self.uuid = null;
    self.onHold = false;
    self.last_ping = null;
    self.pc = null;
    self.pcConfig = {};
    self.default_stun = null;
    self.turn_server = null;
    self.pin = null;
    self.pin_status = 'none';
    self.call_type = '';
    self.mutedAudio = false;
    self.mutedVideo = false;
    self.audio_source = null;
    self.video_source = null;
    self.recv_audio = true;
    self.recv_video = true;
    self.event_listener = null;
    self.screenshare_api = 'pexGetScreen';
    self.screenshare_fps = 5;
    self.screenshare_width = window.screen.width;
    self.screenshare_height = window.screen.height;
    self.powerLineFrequency = 0;
    self.token = null;
    self.token_refresh = null;
    self.registration_token = null;
    self.event_source = null;
    self.event_source_timeout = 0;
    self.rosterList = {};
    self.presentation_msg = {'status': ''};
    self.presentation_event_id = null;
    self.chat_enabled = false;
    self.fecc_enabled = false;
    self.rtmp_enabled = true;
    self.rtsp_enabled = false;
    self.analytics_enabled = false;
    self.allow_1080p = false;
    self.service_type = null;
    self.current_service_type = null;
    self.remote_call_type = null;
    self.guests_can_present = true;
    self.conference_name = null;

    self.dtmf_queue = {};
    self.fecc_queue = {};
    self.h264_enabled = true;
    self.png_presentation = false;
    self.basic_username = null;
    self.basic_password = null;
    self.user_media_stream = null;
    self.return_media_stream = true;

    self.screenshare = null;
    self.presentation = null;
    self.call = null;
    self.flash = undefined;
    self.error = null;

    self.onError = null;
    self.onSetup = null;
    self.onConnect = null;
    self.onHoldResume = null;
    self.onDisconnect = null;
    self.onPresentation = null;
    self.onPresentationReload = null;
    self.onPresentationConnected = null;
    self.onPresentationDisconnected = null;
    self.onRosterList = null;
    self.onScreenshareStopped = null;
    self.onScreenshareMissing = null;
    self.onCallTransfer = null;
    self.onCallDisconnect = null;

    self.onParticipantCreate = null;
    self.onParticipantUpdate = null;
    self.onParticipantDelete = null;
    self.onSyncBegin = null;
    self.onSyncEnd = null;
    self.onChatMessage = null;
    self.onStageUpdate = null;
    self.onMicActivity = null;
    self.onLog = function() { console.log.apply(console, arguments); };
    self.stats = new PexRTCStatistics();
    self.stats.parent = self;
    self.stats_interval = null;

    self.is_android = navigator.userAgent.indexOf('Android') != -1;

    if (navigator.userAgent.indexOf("Chrome") != -1) {
        self.chrome_ver = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
    } else {
        self.chrome_ver = 0;
    }

    if (navigator.userAgent.indexOf("Firefox") != -1) {
        self.firefox_ver = parseInt(window.navigator.userAgent.match(/Firefox\/(\d+)\./)[1], 10);
        if (self.firefox_ver < 38) {
            self.h264_enabled = false;
        }
    } else {
        self.firefox_ver = 0;
    }

    if (navigator.userAgent.indexOf("Edge") != -1) {
        self.edge_ver = parseInt(window.navigator.userAgent.match(/Edge\/\d+\.(\d+)/)[1], 10);
        self.chrome_ver = 0;
    } else {
        self.edge_ver = 0;
    }

    if (self.chrome_ver == 0 && self.edge_ver == 0 && navigator.userAgent.indexOf("Safari") != -1) {
        self.safari_ver = parseInt(window.navigator.appVersion.match(/Safari\/(\d+)\./)[1], 10);
    } else {
        self.safari_ver = 0;
    }

    if (self.safari_ver == 0 && (self.chrome_ver >= 56 || navigator.userAgent.indexOf('OS X') != -1)) {
        // Disable H.264 to work around various issues:
        //   - H.264 hw accelerated decoding fails for some versions
        //     and some hardware, both on OS X and Windows.
        //   - Chrome OS X possibly does not trigger
        //     googCpuLimitedResolution when struggling to encode full
        //     resolution H.264, and thus we're not able to fall back
        //     to VP8 when needed.
        self.h264_enabled = false;
    }

    if (self.safari_ver > 603 || self.chrome_ver > 65 || self.firefox_ver > 59) {
        self.return_media_stream = true;
    }

    self.trans = {
        ERROR_SCREENSHARE_CANCELLED: "Screenshare cancelled",
        ERROR_CALL_FAILED: "Call Failed: ",
        ERROR_WEBRTC_SUPPORT: "Error: WebRTC not supported by this browser",
        ERROR_SCREENSHARE_EXTENSION: "Error: Screenshare extension not found.\n\nHave you installed it from http://www.pexip.com/extension/?",
        ERROR_USER_MEDIA: "Error: Could not get access to camera/microphone.\n\nHave you allowed access? Has any other application locked the camera?",
        ERROR_ICE_CANDIDATES: "Failed to gather IP addresses",
        ERROR_ICE_FAILED: "Failed to establish media to server.\n\nEnsure required firewall ports are permitted.",
        ERROR_PRESENTATION_ENDED: "Presentation ended",
        ERROR_DISCONNECTED_PRESENTATION: "Presentation stream remotely disconnected",
        ERROR_DISCONNECTED_SCREENSHARE: "Screenshare remotely disconnected",
        ERROR_DISCONNECTED: "You have been remotely disconnected from this conference",
        ERROR_CONNECTING_PRESENTATION: "Presentation stream unavailable",
        ERROR_CONNECTING_SCREENSHARE: "Screenshare error",
        ERROR_CONNECTING_EXTENSION: "Conference extension not found",
        ERROR_CONNECTING: "Error connecting to conference"
    };
}


PexRTC.prototype.makeCall = function (node, conf, name, bw, call_type, flash) {
    var self = this;

    self.state = 'ACTIVE';
    self.node = node;
    self.conference = conf;
    self.conference_uri = encodeURIComponent(conf);
    self.display_name = name;
    self.call_type = call_type;
    self.flash = flash;
    if (bw) {
        self.bandwidth_in = parseInt(bw);
        self.bandwidth_out = self.bandwidth_in;
    }

    self.requestToken(function() {
        self.createEventSource();
        if (self.state != 'DISCONNECTING') {
            if (self.call_type != 'none') {
                self.flash = flash;
                self.addCall(null, flash);
            } else {
                self.onSetup(null, self.pin_status, self.conference_extension);
            }
        }
    });
};

PexRTC.prototype.sendRequest = function(request, params, cb, req_method, retries) {
    var self = this;

    // Only do async if explicitly asked
    var async = cb === false ? false : true;
    var method = req_method || "POST";
    var xhr = new XMLHttpRequest();
    var xhrUrl = "https://" + self.node + "/api/client/v2/conferences/" + self.conference_uri + "/" + request;
    console.log("sendRequest" + xhrUrl);
    self.onLog("PexRTC.sendRequest", request, params, method, xhrUrl);
    xhr.open(method, xhrUrl, async);
    if (cb) {
        xhr.onload = cb;
    }
    if (retries === undefined) {
        retries = 0;
    }
    xhr.onerror = function() {
        if (++retries > 10 || cb === false) {
            self.error = "Error sending request: " + request;
            self.onError(self.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, method, retries); }, retries * 500);
        }
    };
    xhr.ontimeout = function() {
        if (++retries > 10 || cb === false) {
            self.error = "Timeout sending request: " + request;
            self.onError(self.trans.ERROR_CONNECTING);
        } else {
            setTimeout(function() { self.sendRequest(request, params, cb, method, retries); }, retries * 500);
        }
    };
    if (self.token) {
        xhr.setRequestHeader('token', self.token);
    } else if (self.pin !== null) {
        xhr.setRequestHeader('pin', self.pin);
    }
    if (self.basic_username && self.basic_password) {
        xhr.setRequestHeader('Authorization', 'Basic ' + Base64.encode(self.basic_username + ':' + self.basic_password));
    }
    if (params) {
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(params));
    } else {
        xhr.send();
    }
    if (cb === false) {
        self.onLog("PexRTC.sendRequest response", xhr.responseText);
        var msg = {};
        try {
            msg = JSON.parse(xhr.responseText);
        } catch (error) {
            msg.reason = xhr.status + " " + xhr.statusText;
        }
        msg.http_status = xhr.status;
        return msg;
    }
};

PexRTC.prototype.requestToken = function(cb) {
    var self = this;

    if (!self.token) {
        var params = {'display_name': self.display_name};
        if (self.registration_token) {
            params.registration_token = self.registration_token;
        }
        if (self.oneTimeToken) {
            params.token = self.oneTimeToken;
            self.oneTimeToken = null;
        }
        if (self.conference_extension) {
            params.conference_extension = self.conference_extension;
        }

        msg = self.sendRequest("request_token", params, function(evt) { self.tokenRequested(evt, cb); });
    } else if (cb) {
        cb();
    }
};

PexRTC.prototype.tokenRequested = function(e, cb) {
    var self = this;

    var msg = {};
    try {
        msg = JSON.parse(e.target.responseText);
        msg.http_status = e.target.status;
    } catch (error) {
        msg.reason = e.target.status + " " + e.target.statusText;
    }

    self.onLog("PexRTC.tokenRequested response", e.target.responseText);

    if (msg.http_status == 200) {
        self.token = msg.result.token;
        self.uuid = msg.result.participant_uuid;
        self.role = msg.result.role;
        self.version = msg.result.version;
        self.chat_enabled = msg.result.chat_enabled;
        self.fecc_enabled = msg.result.fecc_enabled;
        self.rtmp_enabled = msg.result.rtmp_enabled;
        self.rtsp_enabled = msg.result.rtsp_enabled;
        self.analytics_enabled = msg.result.analytics_enabled;
        self.allow_1080p = msg.result.allow_1080p;
        self.service_type = msg.result.service_type;
        self.current_service_type = msg.result.current_service_type;
        self.remote_call_type = msg.result.call_type;
        self.guests_can_present = msg.result.guests_can_present;
        self.conference_name = msg.result.conference_name;

        if (self.edge_ver > 10527) {
            self.pcConfig.bundlePolicy = 'max-compat';
        }

        self.pcConfig.iceServers = [];
        if (self.default_stun) {
            if (self.firefox_ver > 43 || self.edge_ver > 10527 || self.safari_ver > 603) {
                self.pcConfig.iceServers.push({ 'urls' : [self.default_stun] });
            } else {
                self.pcConfig.iceServers.push({ 'url' : self.default_stun });
            }
        }
        if (self.turn_server && self.edge_ver == 0) {
            var turn_servers = []
            if (self.turn_server instanceof Array) {
                turn_servers = self.turn_server;
            } else {
                turn_servers.push(self.turn_server);
            }

            for (var i=0; i<turn_servers.length; i++) {
                if (self.safari_ver > 603) {
                    var is_tcp = false;
                    if (turn_servers[i].hasOwnProperty('url') && turn_servers[i].url.indexOf('transport=tcp') != -1) {
                        is_tcp = true;;
                    } else if (turn_servers[i].hasOwnProperty('urls')) {
                        for (var j=0; j<turn_servers[i].urls.length; j++) {
                            if (turn_servers[i].urls[j].indexOf('transport=tcp') != -1) {
                                is_tcp = true;;
                            }
                        }
                    }

                    if (is_tcp) {
                        continue;
                    }
                }
                self.pcConfig.iceServers.push(turn_servers[i]);
            }
        }
        if ('stun' in msg.result && self.edge_ver == 0) {
            for (var i = 0; i < msg.result.stun.length; i++) {
                if (self.firefox_ver > 43 || self.safari_ver > 603) {
                    self.pcConfig.iceServers.push({ 'urls' : [msg.result.stun[i].url] });
                } else {
                    self.pcConfig.iceServers.push(msg.result.stun[i]);
                }
            }
        }
        self.onLog("ICE Servers:", self.pcConfig);

        if ('bandwidth_in' in msg.result) {
            self.set_bandwidth_in = msg.result.bandwidth_in - 64;
            if (self.set_bandwidth_in < self.bandwidth_in) {
                self.bandwidth_in = self.set_bandwidth_in;
            }
        }
        if ('bandwidth_out' in msg.result) {
            self.set_bandwidth_out = msg.result.bandwidth_out - 64;
            if (self.set_bandwidth_out < self.bandwidth_out) {
                self.bandwidth_out = self.set_bandwidth_out;
            }
        }
    } else if (msg.http_status == 403 && msg.status === 'success') {
        if ('pin' in msg.result) {
            if (msg.result.guest_pin == 'none') {
                self.pin_status = 'optional';
            } else {
                self.pin_status = 'required';
            }
        }
        if ('conference_extension' in msg.result) {
            self.conference_extension = msg.result.conference_extension_type;
        }
    } else if (msg.http_status == 404 && self.conference_extension) {
        return self.onError(self.trans.ERROR_CONNECTING_EXTENSION);
    } else {
        return self.handleError(msg.result || msg.reason);
    }

    if (!self.token_refresh && self.token) {
        var expires = msg.result.expires || 120;
        self.token_refresh = setInterval(self.refreshToken.bind(this), (expires * 1000) / 3);

        self.sendRequest("conference_status", null, function(e) {
            self.onLog("conference_status");
            if (e.target.status == 200 && self.onConferenceUpdate) {
                var msg = JSON.parse(e.target.responseText);
                self.onLog(msg);
                self.onConferenceUpdate(msg.result);
            }
        }, "GET");
    }


    if (cb) {
        cb();
    }
};

PexRTC.prototype.refreshToken = function() {
    var self = this;

    self.sendRequest("refresh_token", null,  function(e) {
        self.onLog("PexRTC.refreshToken response", e.target.responseText);
        var msg = {};
        try {
            msg = JSON.parse(e.target.responseText);
        } catch (error) {
            msg.reason = e.target.status + " " + e.target.statusText;
        }
        if (e.target.status == 200) {
            self.token = msg.result.token;
            if (msg.result.role != self.role) {
                self.role = msg.result.role;
                if (self.onRoleUpdate) {
                    self.onRoleUpdate(self.role);
                }
            }
        } else {
            return self.handleError(msg.result || msg.reason);
        }
    });
};

PexRTC.prototype.createEventSource = function() {
    var self = this;

    if (!self.event_source && self.token) {
        self.event_source = new EventSource("https://" + self.node + "/api/client/v2/conferences/" + self.conference_uri + "/events?token=" + self.token);
        self.event_source.addEventListener("presentation_start", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("presentation_start", msg);
            msg.status = "start";
            if (self.presentation_msg.status != 'start' ||
                self.presentation_msg.presenter_uuid != msg.presenter_uuid) {
                self.processPresentation(msg);
            }
            self.presentation_msg = msg;
        }, false);
        self.event_source.addEventListener("presentation_stop", function(e) {
            var msg = {'status': "stop"};
            self.onLog("presentation_stop", msg);
            if (self.presentation_msg.status != 'stop') {
                self.processPresentation(msg);
            }
            self.presentation_msg = msg;
        }, false);
        self.event_source.addEventListener("presentation_frame", function(e) {
            self.presentation_event_id = e.lastEventId;
            if (self.onPresentationReload && !self.onHold) {
                self.onPresentationReload(self.getPresentationURL());
            }
        }, false);
        self.event_source.addEventListener("participant_create", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("participant_create", msg);
            self.rosterList[msg.uuid] = msg;
            if (msg.uuid == self.uuid && self.current_service_type && msg.service_type) {
                self.current_service_type = msg.service_type;
            }
            if (!self.oldRosterList) {
                if (self.onParticipantCreate) {
                    self.onParticipantCreate(msg);
                }
                if (self.onRosterList) {
                    self.onRosterList(self.getRosterList());
                }
            }
        }, false);
        self.event_source.addEventListener("participant_update", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("participant_update", msg);
            self.rosterList[msg.uuid] = msg;
            if (msg.uuid == self.uuid && self.current_service_type && msg.service_type) {
                self.current_service_type = msg.service_type;
            }
            if (!self.oldRosterList) {
                if (self.onParticipantUpdate) {
                    self.onParticipantUpdate(msg);
                }
                if (self.onRosterList) {
                    self.onRosterList(self.getRosterList());
                }
            }
        }, false);
        self.event_source.addEventListener("participant_delete", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("participant_delete", msg);
            delete self.rosterList[msg.uuid];
            if (!self.oldRosterList) {
                if (self.onParticipantDelete) {
                    self.onParticipantDelete(msg);
                }
                if (self.onRosterList) {
                    self.onRosterList(self.getRosterList());
                }
            }
        }, false);
        self.event_source.addEventListener("message_received", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("message_received", msg);
            if (self.onChatMessage) {
                self.onChatMessage(msg);
            }
        }, false);
        self.event_source.addEventListener("participant_sync_begin", function(e) {
            self.onLog("participant_sync_begin");
            if (!self.oldRosterList) {
                self.oldRosterList = self.rosterList;
            }
            self.rosterList = {};
            if (self.onSyncBegin) {
                self.onSyncBegin();
            }
        }, false);
        self.event_source.addEventListener("participant_sync_end", function(e) {
            self.onLog("participant_sync_end", self.rosterList);
            for (var uuid in self.rosterList) {
                if (!(uuid in self.oldRosterList) && self.onParticipantCreate) {
                    self.onParticipantCreate(self.rosterList[uuid]);
                } else {
                    if (self.onParticipantUpdate) {
                        self.onParticipantUpdate(self.rosterList[uuid]);
                    }
                    delete self.oldRosterList[uuid];
                }
            }
            if (self.onParticipantDelete) {
                for (uuid in self.oldRosterList) {
                    var msg = {'uuid': uuid};
                    self.onParticipantDelete(msg);
                }
            }
            delete self.oldRosterList;
            if (self.onRosterList) {
                self.onRosterList(self.getRosterList());
            }
            if (self.onSyncEnd) {
                self.onSyncEnd();
            }

        }, false);
        self.event_source.addEventListener("call_disconnected", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("call_disconnected", msg);
            if (self.call && self.call.call_uuid == msg.call_uuid) {
                self.call.remoteDisconnect(msg);
            } else if (self.presentation && self.presentation.call_uuid == msg.call_uuid) {
                self.presentation.remoteDisconnect(msg);
            } else if (self.screenshare && self.screenshare.call_uuid == msg.call_uuid) {
                self.screenshare.remoteDisconnect(msg);
            }
        }, false);
        self.event_source.addEventListener("disconnect", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("disconnect", msg);
            var reason = self.trans.ERROR_DISCONNECTED;
            if ('reason' in msg) {
                reason = msg.reason;
            }
            if (self.state != 'DISCONNECTING') {
                self.disconnect();
                if (self.onDisconnect) {
                    self.onDisconnect(reason);
                }
            }
        }, false);
        self.event_source.addEventListener("conference_update", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("conference_update", msg);
            if (self.onConferenceUpdate) {
                self.onConferenceUpdate(msg);
            }
        }, false);
        self.event_source.addEventListener("refer", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("refer", msg);
            self.processRefer(msg);
        }, false);
        self.event_source.addEventListener("on_hold", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("call_hold", msg);
            self.holdresume(msg.setting);
        }, false);
        self.event_source.addEventListener("stage", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("stage", msg);
            if (self.onStageUpdate) {
                self.onStageUpdate(msg);
            }
        }, false);
        self.event_source.addEventListener("layout", function(e) {
            var msg = JSON.parse(e.data);
            self.onLog("layout", msg);
            if (self.onLayoutUpdate) {
                self.onLayoutUpdate(msg);
            }
        }, false);
        self.event_source.addEventListener("refresh_token", function(e) {
            self.onLog("refresh_token");
            self.refreshToken();
        }, false);
        self.event_source.onopen = function(e) {
            self.onLog("event source open");
            self.event_source_timeout = 10;
        };
        self.event_source.onerror = function(e) {
            self.onLog("event source error", e);
            if (self.state != 'DISCONNECTING') {
                self.onLog("reconnecting...");
                self.event_source.close();
                self.event_source = null;
                if (self.event_source_timeout > 15000) {
                    self.error = "Error connecting to EventSource";
                    return self.onError(self.trans.ERROR_CONNECTING);
                }
                setTimeout(function() {
                    self.createEventSource();
                }, self.event_source_timeout);
                self.event_source_timeout += 1000;
            }
        };
    }
};

PexRTC.prototype.setConferenceLock = function(setting) {
    var self = this;

    var command = setting ? "lock" : "unlock";
    self.sendRequest(command);
};

PexRTC.prototype.sendChatMessage = function(message) {
    var self = this;

    var command = "message";
    var params = {'type': 'text/plain', 'payload': message};

    self.sendRequest(command, params);
};

PexRTC.prototype.setMuteAllGuests = function(setting) {
    var self = this;

    var command = setting ? "muteguests" : "unmuteguests";
    self.sendRequest(command);
};

PexRTC.prototype.startConference = function() {
    var self = this;

    var command = "start_conference";
    self.sendRequest(command);
};

PexRTC.prototype.dialOut = function(destination, protocol, role, cb, user_params) {
    var self = this;

    if (!destination) {
        return;
    }

    var command = "dial";
    var params = {'destination': destination,
                  'protocol': (protocol ? protocol : "sip")};
    var streaming = false;

    if (typeof user_params == "string") {
        // Legacy: is in fact the presentationUri
        params.presentation_uri = user_params;
    } else if (user_params !== null && typeof user_params == "object") {
        if ("call_type" in user_params) {
            params.call_type = user_params.call_type;
        }

        if ("dtmf_sequence" in user_params) {
            params.dtmf_sequence = user_params.dtmf_sequence;
        }

        if ("presentation_uri" in user_params) {
            params.presentation_url = user_params.presentation_uri;
        }

        if ("keep_conference_alive" in user_params) {
            params.keep_conference_alive = user_params.keep_conference_alive;
        }

        if ("remote_display_name" in user_params) {
            params.remote_display_name = user_params.remote_display_name;
        }

        if ("overlay_text" in user_params) {
            params.text = user_params.overlay_text;
        }

        if ("prefer_ipv6" in user_params && user_params.prefer_ipv6) {
            params.prefer_ipv6 = user_params.prefer_ipv6;
        }

        if ("streaming" in user_params) {
            streaming = user_params.streaming;
        }
    }

    if (protocol === 'rtmp' || streaming) {
        params.streaming = 'yes';
    }

    if (role && role.toUpperCase() == "GUEST") {
        params.role = "GUEST";
    }

    if (cb) {
        self.sendRequest(command, params, function(e) {
            var msg;
            try {
                msg = JSON.parse(e.target.responseText);
            } catch (SyntaxError) {
                return self.handleError("Unexpected Response: " + e.target.status + " " + e.target.statusText);
            }
            if (e.target.status != 200) {
                return self.handleError(msg.result || msg.reason);
            }
            cb(msg);
        });
    } else {
        var msg = self.sendRequest(command, params, false);
        return msg;
    }
};

PexRTC.prototype.disconnectAll = function() {
    var self = this;

    var command = "disconnect";
    self.sendRequest(command);
};

PexRTC.prototype.getParticipants = function(cb) {
    var self = this;

    var command = "participants";
    self.sendRequest(command, {}, cb, "GET");
};

PexRTC.prototype.setParticipantMute = function(uuid, setting) {
    var self = this;

    var command = "participants/" + uuid + "/";
    command += setting ? "mute" : "unmute";
    self.sendRequest(command);
};

PexRTC.prototype.setParticipantRxPresentation = function(uuid, setting) {
    var self = this;

    var command = "participants/" + uuid + "/";
    command += setting ? "allowrxpresentation" : "denyrxpresentation";
    self.sendRequest(command);
};

PexRTC.prototype.unlockParticipant = function(uuid) {
    var self = this;

    var command = "participants/" + uuid + "/unlock";
    self.sendRequest(command);
};

PexRTC.prototype.holdParticipant = function(uuid) {
    var self = this;

    var command = "participants/" + uuid + "/hold";
    self.sendRequest(command);
};

PexRTC.prototype.resumeParticipant = function(uuid) {
    var self = this;

    var command = "participants/" + uuid + "/resume";
    self.sendRequest(command);
};

PexRTC.prototype.disconnectParticipant = function(uuid) {
    var self = this;

    var command = "participants/" + uuid + "/disconnect";
    self.sendRequest(command);
};

PexRTC.prototype.transferParticipant = function(uuid, destination, role, pin, cb) {
    var self = this;

    var command = "participants/" + uuid + "/transfer";
    var params = { 'conference_alias': destination };
    if (role) {
        params.role = role;
        if (pin) {
            params.pin = pin;
        }
    }

    if (cb) {
        self.sendRequest(command, params, function(e) {
            if (e.target.status == 200) {
                var msg = JSON.parse(e.target.responseText);
                self.onLog(msg);
                cb(msg.result);
            } else {
                cb(false);
            }
        });
    } else {
        self.sendRequest(command, params);
    }
};

PexRTC.prototype.setParticipantSpotlight = function(uuid, setting) {
    var self = this;

    var command = "participants/" + uuid + "/";
    command += setting ? "spotlighton" : "spotlightoff";
    self.sendRequest(command);
};

PexRTC.prototype.overrideLayout = function(new_layout) {
    var self = this;

    var command = "override_layout";
    self.sendRequest(command, new_layout);
};

PexRTC.prototype.setParticipantText = function(uuid, text) {
    var self = this;

    var command = "participants/" + uuid + "/overlaytext";
    var params = { 'text': text };
    self.sendRequest(command, params);
};

PexRTC.prototype.setRole = function(uuid, role) {
    var self = this;

    if (role !== 'chair' && role !== 'guest') {
        throw new Error("Role must be chair or guest");
    }
    var command = "participants/" + uuid + "/role";
    var params = { 'role': role };
    self.sendRequest(command, params, function() {});
};

PexRTC.prototype.handleError = function (err) {
    var self = this;

    if (self.state != 'DISCONNECTING') {
        if (err.hasOwnProperty('message')) {
            self.error = err.message;
        } else {
            self.error = err;
        }
        self.disconnect();
        if (self.onError) {
            if (self.call_type == 'presentation' || self.call_type == 'screen') {
                self.onError(err);
            } else {
                if (err.hasOwnProperty('message')) {
                    err = err.message;
                }
                self.onError(self.trans.ERROR_CALL_FAILED + err);
            }
        }
    }
};

PexRTC.prototype.connect = function(pin, extension) {
    var self = this;

    var doConnect = function() {
        if (self.state != 'DISCONNECTING') {
            if (self.call) {
                self.call.connect();
            } else {
                self.onConnect();
            }
        }
    };

    if (self.pin_status != 'none') {
        self.pin_status = 'none';
        self.pin = pin || 'none';
        self.requestToken(function () {
            self.createEventSource();
            doConnect();
        });
    } else if (extension) {
        self.conference_extension = extension;
        self.requestToken(function () {
            self.createEventSource();
            self.onSetup(null, self.pin_status);
        });
    } else {
        doConnect();
    }
};

PexRTC.prototype.addCall = function(call_type, flash) {
    var self = this;

    var obj;
    if (call_type == 'screen_http') {
        obj = new PexJPEGPresentation();
    } else if (flash || self.call_type == 'rtmp' || self.call_type == 'stream') {
        obj = new PexRTMP(flash);
    } else if (self.call && !call_type) {
        obj = self.call;
    } else {
        obj = new PexRTCCall();
    }

    if (!self.screenshare && (call_type == 'screen' || call_type == 'screen_http')) {
        self.screenshare = obj;
        self.screenshare.onSetup = function(stream) {
            self.screenshare.connect();
        };
        self.screenshare.onConnect = function(stream) {
            self.presentation_msg = {'status': ''};
            if (self.onScreenshareConnected) {
                self.onScreenshareConnected(stream);
            }
        };
        self.screenshare.onDisconnect = function(reason) {
            self.screenshare = null;
            if (self.onScreenshareStopped) {
                self.onScreenshareStopped(reason);
            }
        };
        self.screenshare.onError = function(reason) {
            self.screenshare = null;
            if (self.onScreenshareStopped) {
                self.onScreenshareStopped(reason);
            }
        };
        self.screenshare.onScreenshareMissing = function() {
            self.screenshare = null;
            if (self.onScreenshareMissing) {
                self.onScreenshareMissing();
            } else {
                self.onScreenshareStopped(self.trans.ERROR_SCREENSHARE_EXTENSION);
            }
        };
        self.screenshare.makeCall(self, call_type);
    } else if (!self.presentation && call_type == 'presentation') {
        self.presentation = obj;
        self.presentation.onSetup = function(stream) {
            self.presentation.connect();
        };
        self.presentation.onConnect = function(stream) {
            if (self.onPresentationConnected) {
                self.onPresentationConnected(stream);
            }
        };
        self.presentation.onDisconnect = function(reason) {
            self.presentation = null;
            if (self.onPresentationDisconnected) {
                self.onPresentationDisconnected(reason);
            }
        };
        self.presentation.onError = function(reason) {
            self.presentation = null;
            if (self.onPresentationDisconnected) {
                self.onPresentationDisconnected(reason);
            }
        };
        self.presentation.makeCall(self, call_type);
    } else if (!self.call) {
        self.call = obj;
        self.call.onSetup = function(stream) {
            self.onSetup(stream, self.pin_status, self.conference_extension);
        };
        self.call.onConnect = function(stream) {
            if (self.mutedAudio) {
                self.muteAudio(self.mutedAudio);
            }
            if (self.mutedVideo) {
                self.muteVideo(self.mutedVideo);
            }
            self.onConnect(stream);
        };
        self.call.onDisconnect = function(reason) {
            if (self.call) {
                if (self.stats_interval) {
                    clearInterval(self.stats_interval);
                    self.stats_interval = null;
                }
                self.call = null;
                if (self.onCallDisconnect) {
                    self.onCallDisconnect(reason);
                } else {
                    self.disconnect(reason);
                    self.onDisconnect(reason);
                }
            }
        };
        self.call.onError = function(reason) {
            if (self.call && self.state != 'DISCONNECTING') {
                if (self.stats_interval) {
                    clearInterval(self.stats_interval);
                    self.stats_interval = null;
                }
                self.call = null;
                self.onError(reason);
            }
        };
        self.call.onMicActivity = function() {
            if (self.onMicActivity) {
                self.onMicActivity();
            }
        };
        if (self.call_type == 'screen' || self.call_type == 'screen_http') {
            self.call.onScreenshareMissing = function() {
                if (self.stats_interval) {
                    clearInterval(self.stats_interval);
                    self.stats_interval = null;
                }
                self.call = null;
                if (self.onScreenshareMissing) {
                    self.onScreenshareMissing();
                } else {
                    self.onError(self.trans.ERROR_SCREENSHARE_EXTENSION);
                }
            };
        }

        if ((self.call_type == 'video' || self.call_type == 'rtmp') && self.remote_call_type == 'audio') {
            self.call_type = 'audioonly';
        }

        self.call.makeCall(self, self.call_type);

        var pollMediaStatistics = function() {
            if (self.call.pc && self.call.pc.getStats) {
                if (self.chrome_ver > 0) {
                    self.call.pc.getStats(function (rawStats) {
                        self.stats.updateStats(rawStats.result());
                    });
                } else if (self.firefox_ver > 47) {
                    self.call.pc.getStats(null).then(function (rawStats) {
                        self.stats.updateStatsFF(rawStats);
                    });
                } else if (self.safari_ver > 603) {
                    self.call.pc.getStats(null).then(function (rawStats) {
                        self.stats.updateStatsSafari(rawStats);
                    });
                }
            }
        };
        self.stats_interval = setInterval(pollMediaStatistics, 1000);
    } else if (self.call) {
        self.call.makeCall(self, self.call_type);
    }
    return obj;
};

PexRTC.prototype.disconnectCall = function(referral) {
    var self = this;

    if (self.call) {
        self.call.disconnect(false, referral);
        if (!referral) {
            if (self.stats_interval) {
                clearInterval(self.stats_interval);
                self.stats_interval = null;
            }
            self.call = null;
            self.flash = undefined;
        }
    }
};

PexRTC.prototype.renegotiate = function(call_type) {
    var self = this;

    if (self.call && self.call.update) {
        self.call.update(call_type === undefined ? self.call_type : call_type);
    }
};

PexRTC.prototype.clearLocalStream = function() {
    var self = this;

    if (self.call && self.call.pc) {
        var streams = self.call.pc.getLocalStreams();
        for (var i=0; i<streams.length; i++) {
            self.call.pc.removeStream(streams[i]);
        }
        self.call.localStream = null;
    }
    self.user_media_stream = null;
};

PexRTC.prototype.present = function(call_type) {
    var self = this;
    if (!self.screenshare && call_type) {
        self.addCall(call_type, null);
    } else if (self.screenshare && !call_type) {
        self.screenshare.disconnect(false);
        self.screenshare = null;
        if (self.firefox_ver > 43) {
            self.onScreenshareStopped(self.trans.ERROR_PRESENTATION_ENDED);
        }
    }
};

PexRTC.prototype.muteAudio = function(setting) {
    var self = this;

    if (self.call) {
        self.mutedAudio = self.call.muteAudio(setting);
    } else if (setting !== undefined) {
        self.mutedAudio = setting;
    } else {
        self.mutedAudio = !self.mutedAudio;
    }

    return self.mutedAudio;
};

PexRTC.prototype.muteVideo = function(setting) {
    var self = this;

    if (self.call) {
        self.mutedVideo = self.call.muteVideo(setting);
    } else if (setting !== undefined) {
        self.mutedVideo = setting;
    } else {
        self.mutedVideo = !self.mutedVideo;
    }

    return self.mutedVideo;
};

PexRTC.prototype.sendDTMFRequest = function(digits, target) {
    var self = this;

    if (target == "call") {
        self.sendRequest('participants/' + self.uuid + '/calls/' + self.call.call_uuid + '/dtmf', { 'digits' : digits }, function() { self.dtmfSent(target); });
    } else {
        self.sendRequest('participants/' + target + '/dtmf', { 'digits' : digits }, function() { self.dtmfSent(target); });
    }
};

PexRTC.prototype.sendDTMF = function(digits, target) {
    var self = this;

    target = target || "call";
    if (target == "call" && !self.call) {
        return false;
    }

    if (self.dtmf_queue[target] === undefined) {
        self.dtmf_queue[target] = [];
        self.sendDTMFRequest(digits, target);
    } else {
        self.dtmf_queue[target].push(digits);
    }
};

PexRTC.prototype.dtmfSent = function(target) {
     var self = this;

     if (self.dtmf_queue[target].length === 0) {
         delete self.dtmf_queue[target];
     } else {
        self.sendDTMFRequest(self.dtmf_queue[target].shift(), target);
     }
};

PexRTC.prototype.sendFECCRequest = function(data, target) {
    var self = this;

    if (target == "call") {
        self.sendRequest('participants/' + self.uuid + '/calls/' + self.call.call_uuid + '/fecc', data, function() { self.feccSent(target); });
    } else {
        self.sendRequest('participants/' + target + '/fecc', data, function() { self.feccSent(target); });
    }
};

PexRTC.prototype.sendFECC = function(action, axis, direction, target, timeout) {
    var self = this;

    target = target || "call";
    if (target == "call" && !self.call) {
        return false;
    }

    data = {'action': action, 'movement': [{'axis': axis, 'direction': direction}], 'timeout': timeout};
    if (self.fecc_queue[target] === undefined) {
        self.fecc_queue[target] = [];
        self.sendFECCRequest(data, target);
    } else {
        self.fecc_queue[target].push(data);
    }
};

PexRTC.prototype.feccSent = function(target) {
     var self = this;

     if (self.fecc_queue[target].length === 0) {
         delete self.fecc_queue[target];
     } else {
        self.sendFECCRequest(self.fecc_queue[target].shift(), target);
     }
};

PexRTC.prototype.holdresume = function(setting) {
    var self = this;

    if (self.call) {
        self.call.holdresume(setting);
    }
    if (self.presentation) {
        self.presentation.holdresume(setting);
    }
    if (self.screenshare) {
        self.screenshare.holdresume(setting);
    }

    if (self.onHoldResume) {
        self.onHoldResume(setting);
    }
};

PexRTC.prototype.getRosterList = function() {
    var self = this;

    var roster = [];
    for (var uuid in self.rosterList) {
        roster.push(self.rosterList[uuid]);
    }
    return roster;
};

PexRTC.prototype.processRoster = function(msg) {
    var self = this;

    if (self.onRosterList) {
        self.onRosterList(msg.roster);
    }
};

PexRTC.prototype.getPresentationURL = function() {
    var self = this;
    var url = null;
    var presentation_image = 'presentation.jpeg';
    if (self.presentation_event_id) {
        if (self.png_presentation) {
            url = "https://" + self.node + "/api/client/v2/conferences/" + self.conference_uri + "/presentation.png?id=" + self.presentation_event_id + "&token=" + self.token;
        } else {
	    if (self.bandwidth_in > 512) {
		presentation_image = "presentation_high.jpeg";
	    }
            url = "https://" + self.node + "/api/client/v2/conferences/" + self.conference_uri + "/" + presentation_image + "?id=" + self.presentation_event_id + "&token=" + self.token;
        }
    }
    return url;
};


PexRTC.prototype.getPresentation = function() {
    var self = this;

    if (!self.presentation) {
        self.addCall("presentation");
    } else if (self.onPresentationConnected) {
        if (self.return_media_stream) {
            self.onPresentationConnected(self.presentation.stream);
        } else {
            var url = window.URL || window.webkitURL || window.mozURL;
            self.onPresentationConnected(url.createObjectURL(self.presentation.stream));
        }
    }
};

PexRTC.prototype.stopPresentation = function() {
    var self = this;

    if (self.presentation) {
        self.presentation.disconnect(false);
        self.presentation = null;
    }
};


PexRTC.prototype.processPresentation = function(msg) {
    var self = this;

    if (msg.status == "newframe") {
        if (self.onPresentationReload && !self.onHold) {
            self.onPresentationReload(self.getPresentationURL());
        }
    } else {
        if (self.onPresentation) {
            if (msg.status == "start") {
                var presenter;
                if (msg.presenter_name !== "") {
                    presenter = msg.presenter_name + " <" + msg.presenter_uri + ">";
                } else {
                    presenter = msg.presenter_uri;
                }
                self.onPresentation(true, presenter);
            } else if (msg.status == "stop") {
                self.onPresentation(false, null);
            }
        }
    }
};

PexRTC.prototype.processRefer = function(msg) {
    var self = this;

    self.disconnect("Call transferred", true);
    self.state = 'IDLE';

    if (self.onCallTransfer) {
        self.onCallTransfer(msg.alias);
    }

    self.oneTimeToken = msg.token;

    if (self.state != 'DISCONNECTING') {
        setTimeout(function() {
          self.makeCall(self.node, msg.alias, self.display_name, self.bandwidth_in, self.call_type, self.flash);
        }, 500);
    }
};

PexRTC.prototype.disconnect = function(reason, referral) {
    var self = this;

    self.state = 'DISCONNECTING';
    self.onLog('Disconnecting...');
    self.conference_extension = null;

    if (referral) {
        self.disconnectCall(true);
    } else {
        self.disconnectCall();
    }
    self.present(null);
    self.stopPresentation();

    if (self.event_source) {
        self.event_source.close();
        self.event_source = null;
    }
    if (self.token_refresh) {
        clearInterval(self.token_refresh);
        self.token_refresh = null;
    }
    if (self.token) {
        var params = {};
        if (self.error) {
            params['error'] = self.error;
        }
        if (reason) {
            params['reason'] = reason;
        }
        self.sendRequest("release_token", params, false);
        self.token = null;
    }
};

PexRTC.prototype.sendPresentationImage = function(file) {
    var self = this;
    if (self.screenshare && self.screenshare.sendPresentationImageFile) {
        self.screenshare.sendPresentationImageFile(file);
    }
};

PexRTC.prototype.getMediaStatistics = function() {
    var self = this;

    return self.stats.getStats();
};

PexRTC.prototype.getVersion = function() {
    var self = this;

    if (self.version) {
        return self.version.version_id + " (" + self.version.pseudo_version + ")";
    } else {
        return "Unknown";
    }
};


function PexFlashEventsClass(call) {
    var self = this;

    self.call = call;
}

PexFlashEventsClass.prototype.onError = function() {
    var self = this;
    self.call.onError(self.call.trans.ERROR_DISCONNECTED);
};

PexFlashEventsClass.prototype.onCallEnded = function() {
    var self = this;
    //self.call.onDisconnect(self.call.trans.ERROR_DISCONNECTED);
};

PexFlashEventsClass.prototype.onMicActivity = function() {
    var self = this;
    self.call.onMicActivity();
};

PexFlashEventsClass.prototype.onCameraError = function() {
    var self = this;
    self.call.onError(self.call.trans.ERROR_USER_MEDIA);
};

PexFlashEventsClass.prototype.onConnect = function(stream) {
    var self = this;
    self.call.onConnect(stream);
};


function PexRTCStreamStatistics() {
    var self = this;

    self.lastPackets = 0;
    self.lastLost = 0;
    self.lastBytes = 0;
    self.lastTimestamp = null;
    self.recentTotal = 0;
    self.recentLost = 0;
    self.samples = [];
    self.info = {};
}

PexRTCStreamStatistics.prototype.getStats = function() {
    var self = this;
    return self.info;
};

PexRTCStreamStatistics.prototype.updateBWEStats = function(result) {
    var self = this;
    self.info['configured-bitrate'] = (result.stat('googTargetEncBitrate') / 1000).toFixed(1) + 'kbps';
};

PexRTCStreamStatistics.prototype.updatePacketLossStats = function(currentTotal, currentLost) {
    var self = this;
    if (currentTotal === 0) {
        self.info['percentage-lost'] = '0%';
    } else {
        self.info['percentage-lost'] = (currentLost / currentTotal * 100).toFixed(1) + '%';
    }

    var sample;
    if (self.samples.length >= 60) {
        sample = self.samples.shift();
        self.recentLost -= sample[0];
        self.recentTotal -= sample[1];
    }
    sample = [Math.max(currentLost - self.lastLost, 0), currentTotal - self.lastPackets];
    self.recentLost += sample[0];
    self.recentTotal += sample[1];
    self.samples.push(sample);

    if (self.recentTotal === 0) {
        self.info['percentage-lost-recent'] = '0%';
    } else {
        self.info['percentage-lost-recent'] = (self.recentLost / self.recentTotal * 100).toFixed(1) + '%';
    }
};

PexRTCStreamStatistics.prototype.updateRxStats = function(result) {
    var self = this;
    self.info['packets-received'] = result.stat('packetsReceived');
    self.info['packets-lost'] = result.stat('packetsLost');
    self.info['percentage-lost'] = 0;
    self.info['percentage-lost-recent'] = 0;
    self.info['bitrate'] = "unavailable";

    var packetsReceived = parseInt(self.info['packets-received']) | 0;
    var packetsLost = parseInt(self.info['packets-lost']) | 0;

    self.updatePacketLossStats(packetsReceived, packetsLost);

    if (self.lastTimestamp > 0) {
        var kbps = Math.round((result.stat('bytesReceived') - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
        self.info['bitrate'] = kbps + 'kbps';
    }

    if (result.stat('googFrameHeightReceived'))
        self.info['resolution'] = result.stat('googFrameWidthReceived') + 'x' + result.stat('googFrameHeightReceived');

    if (result.stat('googCodecName'))
        self.info['codec'] = result.stat('googCodecName');

    if (result.stat('googDecodeMs'))
        self.info['decode-delay'] = result.stat('googDecodeMs') + 'ms';

    self.lastTimestamp = result.timestamp;
    self.lastBytes = result.stat('bytesReceived');
    self.lastPackets = packetsReceived;
    self.lastLost = packetsLost;
};

PexRTCStreamStatistics.prototype.updateTxStats = function(result) {
    var self = this;

    self.info['packets-sent'] = result.stat('packetsSent');
    self.info['packets-lost'] = result.stat('packetsLost');
    self.info['percentage-lost'] = 0;
    self.info['percentage-lost-recent'] = 0;
    self.info['bitrate'] = "unavailable";

    var packetsSent = parseInt(self.info['packets-sent']) | 0;
    var packetsLost = parseInt(self.info['packets-lost']) | 0;

    self.updatePacketLossStats(packetsSent, packetsLost);

    if (self.lastTimestamp > 0) {
        var kbps = Math.round((result.stat('bytesSent') - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
        self.info['bitrate'] = kbps + 'kbps';
    }

    if (result.stat('googFrameHeightSent'))
        self.info['resolution'] = result.stat('googFrameWidthSent') + 'x' + result.stat('googFrameHeightSent');

    if (result.stat('googCodecName'))
        self.info['codec'] = result.stat('googCodecName');

    self.lastTimestamp = result.timestamp;
    self.lastBytes = result.stat('bytesSent');
    self.lastPackets = packetsSent;
    self.lastLost = packetsLost;
};

PexRTCStreamStatistics.prototype.updateRxStatsFF = function(result) {
    var self = this;

    self.info['packets-received'] = result.packetsReceived;
    self.info['packets-lost'] = result.packetsLost;
    self.info['percentage-lost'] = 0;
    self.info['bitrate'] = "unavailable";

    var packetsReceived = parseInt(self.info['packets-received']) | 0;
    var packetsLost = parseInt(self.info['packets-lost']) | 0;

    self.updatePacketLossStats(packetsReceived, packetsLost);

    if (self.lastTimestamp > 0) {
        var tsDiff = result.timestamp - self.lastTimestamp;
        if (tsDiff > 500000) {
            // Safari is in milliseconds
            tsDiff = tsDiff / 1000;
        }
        var kbps = Math.round((result.bytesReceived - self.lastBytes) * 8 / tsDiff);
        self.info['bitrate'] = kbps + 'kbps';
    }

    self.lastTimestamp = result.timestamp;
    self.lastBytes = result.bytesReceived;
    self.lastPackets = packetsReceived;
    self.lastLost = packetsLost;
};

PexRTCStreamStatistics.prototype.updateTxStatsFF = function(result) {
    var self = this;

    self.info['packets-sent'] = result.packetsSent;
    self.info['bitrate'] = "unavailable";

    var packetsSent = parseInt(self.info['packets-sent']) | 0;

    if (self.lastTimestamp > 0) {
        var tsDiff = result.timestamp - self.lastTimestamp;
        if (tsDiff > 500000) {
            tsDiff = tsDiff / 1000;
        }
        var kbps = Math.round((result.bytesSent - self.lastBytes) * 8 / tsDiff);
        self.info['bitrate'] = kbps + 'kbps';
    }

    self.lastTimestamp = result.timestamp;
    self.lastBytes = result.bytesSent;
    self.lastPackets = packetsSent;
};

PexRTCStreamStatistics.prototype.updateRtcpTxStatsFF = function(result) {
    var self = this;

    self.info['packets-lost'] = result.packetsLost;
    //self.info['jitter'] = result.jitter;

    var packetsSent = parseInt(self.info['packets-sent']) | 0;
    var packetsLost = parseInt(self.info['packets-lost']) | 0;
    self.updatePacketLossStats(packetsSent, packetsLost);
};

function PexRTCStatistics() {
    var self = this;

    self.audio_out = new PexRTCStreamStatistics();
    self.audio_in = new PexRTCStreamStatistics();
    self.video_out = new PexRTCStreamStatistics();
    self.video_in = new PexRTCStreamStatistics();
    self.googCpuLimitedResolution = "false";
}

PexRTCStatistics.prototype.updateStats = function(results) {
    var self = this;

    for (var i = 0; i < results.length; ++i) {
        if (self.statIsOfType(results[i], 'audio', 'send')) self.audio_out.updateTxStats(results[i]);
        else if (self.statIsOfType(results[i], 'audio', 'recv')) self.audio_in.updateRxStats(results[i]);
        else if (self.statIsOfType(results[i], 'video', 'send')) { self.video_out.updateTxStats(results[i]); self.updateGoogCpuLimitedResolution(results[i]); }
        else if (self.statIsOfType(results[i], 'video', 'recv')) self.video_in.updateRxStats(results[i]);
        else if (self.statIsBandwidthEstimation(results[i])) self.video_out.updateBWEStats(results[i]);
    }
};

PexRTCStatistics.prototype.updateStatsFF = function(results) {
    var self = this;

    var keys = results.keys();
    for (var key_i = keys.next(); !key_i.done; key_i = keys.next()) {
        var key = key_i.value;
        if (key.indexOf('outbound_rtp_audio') === 0) self.audio_out.updateTxStatsFF(results.get(key));
        else if (key.indexOf('outbound_rtcp_audio') === 0) self.audio_out.updateRtcpTxStatsFF(results.get(key));
        else if (key.indexOf('inbound_rtp_audio') === 0) self.audio_in.updateRxStatsFF(results.get(key));
        else if (key.indexOf('outbound_rtp_video') === 0) self.video_out.updateTxStatsFF(results.get(key));
        else if (key.indexOf('outbound_rtcp_video') === 0) self.video_out.updateRtcpTxStatsFF(results.get(key));
        else if (key.indexOf('inbound_rtp_video') === 0) self.video_in.updateRxStatsFF(results.get(key));
    }
};

PexRTCStatistics.prototype.updateStatsSafari = function(results) {
    var self = this;

    var keys = results.keys();
    for (var key_i = keys.next(); !key_i.done; key_i = keys.next()) {
        var key = key_i.value;
        if (key.indexOf('RTCOutboundRTPAudioStream') === 0) self.audio_out.updateTxStatsFF(results.get(key));
        else if (key.indexOf('RTCInboundRTPAudioStream') === 0) self.audio_in.updateRxStatsFF(results.get(key));
        else if (key.indexOf('RTCOutboundRTPVideoStream') === 0) self.video_out.updateTxStatsFF(results.get(key));
        else if (key.indexOf('RTCInboundRTPVideoStream') === 0) self.video_in.updateRxStatsFF(results.get(key));
    }
};

PexRTCStatistics.prototype.statIsBandwidthEstimation = function(result) {
    return result.type == 'VideoBwe';
};

PexRTCStatistics.prototype.statIsOfType = function(result, type, direction) {
    var self = this;
    return result.type == 'ssrc' && result.stat('mediaType') == type && result.id.search(direction) != -1;
};

PexRTCStatistics.prototype.updateGoogCpuLimitedResolution = function(result) {
    var self = this;

    var newLimit = result.stat('googCpuLimitedResolution');
    if (newLimit == "true" && newLimit != self.googCpuLimitedResolution && self.parent.chrome_ver > 55 && self.parent.h264_enabled == true) {
        self.parent.onLog('googCpuLimitedResolution triggered, renegotiating to VP8');
        self.googCpuLimitedResolution = newLimit;
        self.parent.h264_enabled = false;
        self.parent.renegotiate();
    }
};

PexRTCStatistics.prototype.getStats = function() {
    var self = this;
    if (self.parent.firefox_ver > 0 && self.parent.firefox_ver < 47) {
        return {};
    }
    if (self.audio_in.lastTimestamp === null) {
        return {};
    }
    return {'outgoing': {'audio': self.audio_out.getStats(),
                         'video': self.video_out.getStats()},
            'incoming': {'audio': self.audio_in.getStats(),
                         'video': self.video_in.getStats()}};
};
