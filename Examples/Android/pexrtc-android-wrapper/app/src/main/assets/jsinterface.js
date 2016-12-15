var video;
var rtc = null;


function finalise(event) {
    rtc.disconnect();
    video.src = "";
}

function initialise() {
    video = document.getElementById("video");
    rtc = new PexRTC();

    window.addEventListener('beforeunload', finalise);
}

function setInstanceVariable(name, value) {
    rtc[name] = value;
}

function setEvent(name) {

    rtc[name] = (function (n) {
        var storedName = n;
        return function () {
            window[storedName].runOnUI(Array.from(arguments).map(stringify));
        }
    }(name));
}

function getField(name) {
    return rtc[name];
}

function evaluateFunction() {
    var args = Array.from(arguments);
    var name = args.shift();
    return rtc[name].apply(rtc, args);
}

function stringify(value) {
    if (value === null) {
        return null;
    }
    if (typeof value === 'object' || Array.isArray(value)) {
        return JSON.stringify(value);
    }
    if (typeof value  !== 'string') {
        return String(value);
    }
    return value;
}

function loadVideo(blob) {
    video.src=blob;
}

function fetchPexRTCSource(host) {
    var script = document.createElement("script");
    script.onload = function() {
        rtc = new PexRTC();
        window["fetchCallback"].runOnUI([]);
    }
    if (host) {
        script.src = "https://" + host + "/static/webrtc/js/pexrtc.js";
    } else {
        script.src = "pexrtc.js"
    }
    document.head.appendChild(script);
}