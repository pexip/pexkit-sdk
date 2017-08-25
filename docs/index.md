---
layout: default
name: pexip-app-development
---
# Pexip App Development

<!-- old skool alignment -->
<div style="width:100%">
<div style="float:left;width:12%">
<img src="larry_sml.png" alt="picture of larry the dev">
</div>
<div style="float:left;width:87%;padding-left:10px">
<p>So you want to build a cross platform mobile app using Pexip as a backend ?
<br>Interested in using a single code base to make development, testing and deployment easier ?
<br>You've come to the right place.</p>
</div>
<div style="clear:both"></div>
</div>

## What you'll get here

We'll try and show you how to build a simple cross platform app using
the [Cordova](https://cordova.apache.org) platform for an iOS and
Android device.  We'll also give a brief introduction to the client
API and cover some basic concepts you'll need when using the Pexip
platform from a client perspective.

We'll also include a section on building native apps.  This will
primarily cover the use of the WebRTC binaries for iOS as this is the
most difficult part of getting something working natively.  Android
has support for WebRTC in it's webview whilst Safari (at the time of
writing) does not.

## Before we start

We'll be developing our application using Cordova so you'll need a
basic understanding of HTML, CSS and JavaScript - you don't need to be
a guru, but this shouldn't be your first rodeo ;-)

Along with these basic web technology skills, you should also have an
understanding of how REST API's work and be comfortable operating on
the command line.

The examples shown here can be developed on any platform but you will
need an Apple Mac if you want to deploy to an iOS device.

If you're going to try and build a native app, you'll need a good grasp of Swift or Java and how to use the appropriate IDE (XCode or Android Studio).

We won't be covering how to make your application look amazing or
be [accessible](https://www.w3.org/WAI/mobile/) to all users - that's
up to you.

We also suggest you keep the following links to hand for reference:

 - [Pexip Administration Introduction](https://docs.pexip.com/admin/admin_intro.htm)
 - [Pexip Client REST API Documentation](https://docs.pexip.com/api_client/api_rest.htm)
 - [PexRTC Documentation](https://docs.pexip.com/api_client/api_pexrtc.htm)
 - [Pexip Services Guide](https://docs.pexip.com/admin/admin_services.htm)
 - [WebRTC FAQ](https://webrtc.org/faq/)

Oh, it's also super useful if you have a Pexip deployment to work against.

You haven't got one yet?  No worries - sign up for a **[free test drive](https://www.pexip.com/testdrive)** and give it a go.

## Here we go {#start}

 - [Basic Concepts](basic_concepts) - requesting tokens, event streams etc
 - [Presentations](presentations) - sending and receiving presentations
 - [Messaging](messaging) - sending and receiving chat messages
 - [Audio and Video](media) - starting audio and video
 
### Building your Cordova app

 - [Basic Setup](cordova_initial_setup) - getting the build environment sorted and a basic call running
 
### Building a native app for iOS

 - [Building the WebRTC binary](building_webrtc)
 - [Establishing Media](ios_media)

### Building a native app for Android

 - [Setting up the PexRTC wrapper](pexrtc_wrapper)

### Building a desktop app using Electron
