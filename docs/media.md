---
---
# Establishing Media

Once connected to the conference as an API participant you can then
escalate media.  Media escalation can be audio only or a full
audio/video session.  This part of the call flow is more involved as
it requires you to setup media devices (cameras and microphones) and
also perform what is called the offer/answer dance whereby the two
participants in the conversation (your application and the MCU media
engine) decide what codecs to use and how best to route media to each
other using ICE negotiation.  It is here where you can set things like
bandwidth of the call and video resolution.

If you are using PexRTC in a Cordova app, this negotiation will be handled for you but it is useful to understand what's happening under the covers.  The sections on the RTCPeerConnection are useful when building a native application using the WebRTC libraries directly (e.g. in iOS)

There are specific details on establishing media with the WebRTC libraries for iOS [here](ios_media) and using PexRTC with Cordova [here](cordova_basic_call)

## High level call flow

<img src="images/media_flow_sequence.png" alt="basic media flow" style="display:block;margin:auto">
