---
---
# Cordova initial setup

## Requirements

You'll need the following installed on your development platform (your platform package manager should be able to install these for you e.g. `homebrew` on mac or `apt` on Debian style systems.

 - `cordova`
 - `npm` and `nodejs`

If you're building for Android, make sure you have Android Studio installed and all of the required SDK's for your deployment platform (and your `ANDROID_HOME` variable is set).  If you're building for iOS make sure you have XCode installed along with the command line tools for xcode (`xcode-select --install`)

At the time of writing, we're using cordova version 7.0.1 for these demos.

We'll be pulling in `pexrtc.js` directly from our deployment here.  You might want to consider bundling PexRTC with your app.  You should also have read the discussion around DNS in the [basic concepts](basic_concepts) section.  It's also useful to read up on [PexRTC](https://docs.pexip.com/api_client/api_pexrtc.htm) to see what it can do for you.

## Building for Android

Create your app and add the platform:

	cordova create cordovademo com.pexip.cordovademo DemoApp

	cordova platform add android

Modify `config.xml` to add in the following to the android platform section:


	<config-file mode="merge" parent="/*" target="AndroidManifest.xml">
	<uses-permission android:name="android.permission.CAMERA"/>
	<uses-permission android:name="android.permission.RECORD_AUDIO"/>
	<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
	<uses-permission android:name="android.permission.INTERNET"/>

	<uses-feature android:name="android.hardware.camera" android:required="true"/>
	<uses-feature android:name="android.hardware.camera.autofocus" android:required="true"/>
	</config-file>

You'll also need to add the following plugins to get the permissions
working for newer android releases:

The following plugin makes sure the permissions end up in the android manifest file:

	cordova plugin add --save cordova-custom-config

The following plugin sets up the runtime permissions for later
versions of android (6.0/Marshmallow onwards)

	cordova plugin add --save cordova-plugin-android-permissions

You'll also need to add the XML namespace tag for android to the
`widget` element of the config file:

	xmlns:android="http://schemas.android.com/apk/res/android"

At this point you should be able to run a `cordova build` and see a
successful run.

Taking the stock `index.html` as a starter template, let's modify it
to create our basic app structure:

edit `index.html` to add minimal bits:

You might need to remove the meta tag to allow loading properly

	<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;">

Link to `pexrtc.js` from your Pexip deployment:

	<script type="text/javascript" src="https://mydeployment.com/static/webrtc/js/pexrtc.js"></script>

Add in structure of page with video tag (remove the `style.css` for the moment)


	<div width='100%' height='100%' style='overflow:auto' id="viewport">
	  <video width="100%"
		 id="video"
		 autoplay="autoplay"
		 poster="https://mydeployment.com/static/webrtc/img/spinner.gif"/>
	</div>

Add some basic input fields:

	<form id="inputFields">
	  <fieldset>
	    URI: <input type="text" id="uriField" />
	    <br>
	    PIN: <input type="text" id="userPin" />
	    <br>
	    <button type="button" onclick="app.connect();return false">DIAL</button>
	  </fieldset>
	</form>

And somewhere to show a roster list:

	<div id="rosterContainer">
	  <ul id="rosterList">
	  </ul>
	</div>

Now we can add in the basic parts of the JS in the default cordova template `js/index.js`

declare everything we need:

	var rtc;
	var bandwidth;
	var pin;
	var video;
	var conference;
	var node;
	var permissions;

In `onDeviceReady` handler, let's setup a few things like requesting
permissions, getting the video element, setting a bandwidth, add some
handlers for the PexRTC callbacks.

	// get rid of this 
	// this.receivedEvent('deviceready');
	permissions = cordova.plugins.permissions;
	permissions.requestPermission(permissions.CAMERA, success, error);
	permissions.requestPermission(permissions.RECORD_AUDIO, success, error);

	video = document.getElementById("video");
	bandwidth = '384';

	rtc = new PexRTC();
	console.log('RTC is ', rtc);
	video = document.getElementById('video');

	window.addEventListener('beforeunload', finalise);

	rtc.onSetup = doneSetup;
	console.log('doneSetup is a:', doneSetup);
	rtc.onConnect = connected;
	rtc.onError = remoteDisconnect;
	rtc.onDisconnect = remoteDisconnect;
	rtc.onParticipantCreate = participantCreate;
	rtc.onParticipantDelete = participantDelete;

create a connect function to handle the click from the button:


	connect: function() {
		console.log('Connecting....');
		conference = document.getElementById('uriField').value.split('@')[0]
		node =  document.getElementById('uriField').value.split('@')[1]
		pin =  document.getElementById('userPin').value
		rtc.makeCall(node, conference, 'Ethel', bandwidth);
		// don't refresh the page here
		return false
	},


Now after the `app.initialize();` we create the handler methods:

	function doneSetup(videoURL, pin_status) {
		console.log('doneSetup with pin_status and pin: ', pin_status, pin);
		rtc.connect(pin)
	}

	function connected(videoURL) {
		console.log('connected');
		video.poster = "";
		video.src = videoURL
	}

	function remoteDisconnect() {
		console.log('remote disconnect');
	}

	function finalise() {
		console.log('finalise');
		rtc.disconnect();
		video.src = "";
	}

	function error() {
	  console.warn('Missing permissions');
	}

	function success( status ) {
	  if( !status.hasPermission ) error();
	}

	function participantCreate(participant) {
		console.log('participant created: ', participant);
		var newParticipant = document.createElement('li')
		newParticipant.id = participant.uuid;
		newParticipant.appendChild(document.createTextNode(participant.display_name));
		document.getElementById('rosterList').appendChild(newParticipant);
	}

	function participantDelete(participant) {
		console.log('participant deleted: ', participant);
		var toRemove = document.getElementById(participant.uuid);
		document.getElementById('rosterList').removeChild(toRemove);
	}

At this point, you should be able to join a conference and see/hear
stuff and also see participants in the roster list.

### Adding selfview.

Simply add another video element and hook it up to the right stream:

	<div id="fieldsAndSelfView" style="width:100%;">
	  <div id="form" style="float:left;width:59%">
	    <form id="inputFields">
	      <fieldset>
		URI: <input type="text" id="uriField" />
		<br>
		PIN: <input type="text" id="userPin" />
		<br>
		<button type="button" onclick="app.connect();return false">DIAL</button>
	      </fieldset>
	    </form>
	  </div>
	  <div id="selfviewcontainer" style="float:left;width:30%;border:1px solid black">
	    <video id="selfView" width="100%" autoplay="autoplay" />
	  </div>
	</div>

Now fill it with the video by modifying the `doneSetup` callback

	function doneSetup(videoURL, pin_status) {
		console.log('doneSetup with pin_status and pin: ', pin_status, pin);
		document.getElementById('selfView').src = videoURL;
		rtc.connect(pin)
	}


## Adding support for iOS

Continuing on from above, we'll now use an off-the-shelf RTC plugin that has the WebRTC binary already built for us.

	cordova platform add ios
	cordova plugin add --save cordova-plugin-iosrtc

Setup the hook (from the repo)

	<hook src="hooks/iosrtc-swift-support.js" type="before_build" />

You will also need another hook to setup the permissions for iOS in the `Info.plist`.  We're using PlistBuddy to do the work for us here so create a shell script that looks like:

	#!/bin/bash

	PLIST=platforms/ios/*/*-Info.plist

	cat << EOF |
	Delete :NSCameraUsageDescription
	Add :NSCameraUsageDescription string "We need you camera to show video"
	Delete :NSMicrophoneUsageDescription
	Add :NSMicrophoneUsageDescription string "We need you microphone to hear you"
	EOF
	while read line
	do
	  /usr/libexec/PlistBuddy -c "$line" $PLIST
	done

	true

Make sure this file is executable (`chmod +x ios-permissions-hook.sh`) and add it to the `config.xml`:

	<hook src="hooks/ios-permissions-hook.sh" type="before_build" />

Add some platform detection to register the globals:

	if (cordova.platformId === 'ios') {
	    cordova.plugins.iosrtc.registerGlobals();
	    console.log('XXX registered globals');
	} else {
	    console.log('XXX android');
	    permissions = cordova.plugins.permissions;
	    permissions.requestPermission(permissions.CAMERA, success, error);
	    permissions.requestPermission(permissions.RECORD_AUDIO, success, error);
	}	

You will also need to modify the way we load `PexRTC` as register
globals will run after PexRTC has loaded so `window.PexRTC` will be
null at that point and cause problems.  Comment out the static load
and add this to the device ready

	// get around the null PexRTC if the script is loaded statically
	console.log('Adding pexrtc');
	var pexrtc_script = document.createElement('script');
	pexrtc_script.type = 'text/javascript';
	pexrtc_script.src = 'https://mydeployment.com/static/webrtc/js/pexrtc.js';
	pexrtc_script.onload = function() {
		rtc = new PexRTC();
		console.log('RTC is ', rtc);
		video = document.getElementById('video');

		window.addEventListener('beforeunload', finalise);

		rtc.onSetup = doneSetup;
		console.log('doneSetup is a:', doneSetup);
		rtc.onConnect = connected;
		rtc.onError = remoteDisconnect;
		rtc.onDisconnect = remoteDisconnect;
		rtc.onParticipantCreate = participantCreate;
		rtc.onParticipantDelete = participantDelete;    
	};
	document.head.appendChild(pexrtc_script);

You'll then need to build and open up the `xcworkspace` file to add a
team and check for compilation errors.

(might need to get it to run xcode conversion to swift 3 or set the version build setting)

You'll also need to change the bridging header to point to the right one

from:

	$(PROJECT_DIR)/$(PROJECT_NAME)/Bridging-Header.h
	
to

	$(PROJECT_DIR)/$(PROJECT_NAME)/Plugins/cordova-plugin-iosrtc/cordova-plugin-iosrtc-Bridging-Header.h
		
You can now run the app from the XCode.

At this point you should have a basic audio/video call up and running on both platforms from a single code base - congratulations !

# Note

Due to the rate of change of various API's and underlying
technologies, these instructions are best effort and some tweaks may
need to be made for the latest releases.
