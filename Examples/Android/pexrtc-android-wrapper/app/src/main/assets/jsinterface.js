var video;
var selfVideo;
var rtc = null;
var pin = null;


function finalise(event) {
    console.log("finalise");
    rtc.disconnect();
    video.src = "";
    video.srcObject = null;
}

function initialise() {
    console.log("initialise");
    video = document.getElementById("video");
    selfVideo = document.getElementById("selfVideo");
    video.autoplay = true;
    selfVideo.autoplay = true;
    rtc = new PexRTC();
    rtc.onConnect = connected;
    rtc.onSetup = onSetupCall;
    window.addEventListener('beforeunload', finalise);
}

function onSetupCall(url){
   loadVideo(selfVideo, url);
   rtc.connect(pin);
}
function connected(url) {
    console.log("connected");
    loadVideo(video, url);
}
function setInstanceVariable(name, value) {
    console.log("setInstanceVariable");
    rtc[name] = value;
}

function setPin(pinValue){
    pin = pinValue;
}

function showSelfView(){
   selfVideo.style.visibility = "visible"
}

function hideSelfView(){
   selfVideo.style.visibility = "hidden"
}

function setEvent(name) {
    console.log("setEvent");
    rtc[name] = (function (n) {
        var storedName = n;
        return function () {
            window[storedName].runOnUI(Array.from(arguments).map(stringify));
        }
    }(name));
}

function getField(name) {
    console.log("getField");
    return rtc[name];
}

function evaluateFunction() {
    console.log("evaluateFunction");
    var args = Array.from(arguments);
    var name = args.shift();
    return rtc[name].apply(rtc, args);
}

function stringify(value) {
    console.log("stringify");
    if (value === null) {
        return null;
    }
    if (typeof value === 'object' || Array.isArray(value)) {
        console.log("object");
        return JSON.stringify(value);
    }
    if (typeof value  !== 'string') {
        console.log("No string");
        return String(value);
    }
    return value;
}

function loadVideo(videoElement, url) {
    if (typeof(MediaStream) !== "undefined" && url instanceof MediaStream) {
            console.log("MediaStream");
            videoElement.srcObject = url;
    } else {
            console.log("BlobUrl");
            videoElement.src = url;
    }
}

function fetchPexRTCSource(host) {
    console.log("fetchPexRTCSource");
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