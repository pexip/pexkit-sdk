---
---
# Building WebRTC

At the time of writing, there is no native support for WebRTC in the
safari view controller so the only way to work with WebRTC is via a
binary install of the WebRTC library and rendering the results using
RTCEAGLViews in your UI.  You will need to build the WebRTC library
yourself and then include the header files (or framework) in your
project.  If you are using Swift, make sure that a bridging header is
in place to expose the bindings.  All examples for this document will
use Swift but the concepts transfer directly for Objective-C based
applications.

The library can be compiled with the full instruction set for use on
all ARM platforms and also with 386 and X86_64 instructions for use in
the simulator.  You can control which platforms to target and hence
control the size of the included library.  When submitting to the App
Store, you *must* remove these non-ARM architectures from the
library or your app will be rejected.

## Bitcode support

At the time of writing, there is also no support for Bitcode in the
library so you will need to disable this for your project.

## Hardware Acceleration

Hardware acceleration is enabled by default for the latest builds of
WebRTC and this should dramatically reduce the CPU load used when
decoding H264 streams but be aware that decoding video and audio is
still a very intensive workload and consideration should be taken when
deciding bandwidths and resolutions to negotiate with the MCU i.e. a
2Mbps stream at 720p HD resolution will require a modern ARM processor
and a lot of CPU power and older phones will struggle to decode this
in a timely manner.

On iOS devices with an A4 up to A6 processor, there is support for
H.264/AVC/MPEG-4 Part 10 (until profile 100 and up to level 5.1),
MPEG-4 Part 2, and H.263.  The A7 added support for H.264’s
profile 110.

## Custom patches for Pexip

At the time of writing, there is a custom patch to workaround support
for rotation of video streams that must be applied in order for the
video stream to be rotated to the correct orientation.  See [patches](https://github.com/pexip/pexkit-sdk/tree/master/Examples/Extras/WebRTC_patches) here

The reader is advised to use a "branch head" when building rather than
master as this is slightly more stable and reliable when building.  At
the time of writing, branch head 56 was used.

	git checkout branch-heads/56
	glclient sync

We recommend building the framework as this greatly simplifies
addition to your project although if you want more fine grained
control, you can build the static library and only include what you
need.

## Building

Building WebRTC for iOS must be performed on a Mac - these examples
were performed on a Macbook Pro running macOS 10.12.1.  The canonical
build instructions are [here](https://webrtc.org/native-code/ios/) but the
following process is a good summary.

### Prerequisites

#### depot tools

Clone the depot tools

	git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git

Make sure they are in your path:

	export PATH=`pwd`/depot_tools:$PATH

#### WebRTC code

Create a working directory, enter it and fetch the code:

	mkdir ~/webrtc
	cd ~/webrtc
	fetch —nohooks webrtc_ios

Now sync and pull down the code.  This will take a long time and
should not be interrupted as multiple gigabytes of data will be
downloaded.

	gclient sync

### Building
Once you have the source (and have applied any necessary patches) you
can either build a static binary or a framework.  Building a framework
is the simpler option but the static binary gives you more control.

#### Building the framework

	cd ~/webrtc/src

Build the framework:

	./webrtc/build/ios/build_ios_libs.sh

The result will be a directory called `out_ios_libs` containing the
framework called `WebRTC.framework`.  You can now embed this directly
into you project.

#### Building the static Binary

	cd ~/webrtc/src

Build the static binary:

	./webrtc/build/ios/build_ios_libs.sh -b static_only -o out

The result will be a library and a set of headers in the `out`
directory.

The `out` directory will contain a single `librtc_sdk_objc.a` with all
architectures combined and sub directories containing the individual
architectures.  The header files will be located in
`./webrtc/sdk/objc/Framework/Headers/WebRTC/`

If the build script fails you can run the compilation manually:


	gn gen out/arm64 --args='target_os="ios" target_cpu="arm64" \
	is_component_build=false is_debug=false’
	gn gen out/arm --args='target_os="ios" target_cpu="arm" \ 
	is_component_build=false is_debug=false’

	ninja -C out/arm64 rtc_sdk_framework_objc
	ninja -C out/arm rtc_sdk_framework_objc

##### Adding WebRTC and headers to your Swift project

1. Create a new group in your project hierarchy called WebRTC and
   create a new header file called ~<bundle id>-Bridging-Header.h~
2. Copy in the binary lib and headers created in the build process above.
3. Add the import lines to the bridging header
   1. You can run the following command from the headers directory to
      get a listing ready to paste in:
      
	  <code>ls *h | awk '{print "#import \"" $NF "\""}'</code>
      
	  You won't need all of these headers and the macOS ones can be
      removed.
4. Make sure `Build Settings -> Objective-C Bridging Header` has a
   path set to the new bridging header you created
5. Include all the other frameworks and libraries required for proper
   operation including your freshly built `librtc_sdk_objc` library,
   in the following order:
   - libresolv.tbd
   - AVFoundation.framework
   - CoreMedia.framework
   - GLKit.framework
   - OpenGLES.framework
   - CoreVideo.framework
   - CoreAudio.framework
   - QuartzCore.framework
   - AudioToolbox.framework
   - libc++.tbd
   - libstdc++.tbd
   - VideoToolbox.framework
   - librtc_sdk_objc.a

#### Other settings

 - Make sure the `Build Settings -> Other linker flags` is set to
   `-ObjC` or you’ll get weird crashes about unknown signatures.
 - turn off bit-code support in `Build Settings`
