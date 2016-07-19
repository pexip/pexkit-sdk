# PexKit for iOS

## Hardware Acceleration

As of 7.4.9 (03/11/2015) PexKit has enabled hardware acceleration.
Default resolutions are based on connectivity (cellular/wifi) and
platform type.

For Wifi connectivity, all devices will get 448p.  For cellular
connectivity iPad will get wCIF whilst iPhone will get 216p

You can force the resolution in the SDK by setting the `resolution`
property on the conference object e.g.

    self.conference.videoResolution = UIDevice.currentDevice().userInterfaceIdiom == .Pad ? .hd : .p448

Currently supported resolutions are wqcif, p216, wcif, p448, p576 and
hd - see the `Resolution` enum for more information.

Be mindful of the device you are targeting when setting the
resolution as older devices e.g. iPhone 5 will struggle with the
higher resolutions.

## Releasing to the app store

The SDK called PexKit-SDK-<date> contains symbols to allow you to run
your apps on the iOS simulators.  This cannot be used to submit to the
app store.  When submitting your final app, please rebuild using the
PexKit-Release-SDK.  The content is identical but the i386 and x86_64
symbols have been removed.

## Changelog

 - 7.5.4 (PexKit-SDK-2016-07-19_v7.5.4)   : Minor fix for backwards compatibility on older event
                                            messages
 - 7.5.3 (PexKit-SDK-2016-07-12_v7.5.3)   : Fix `isAudioOnly`, tighten up calendar scraping
                                            to prevent erroneous PIN entry
 - 7.5.2 (PexKit-SDK-2016-07-07_v7.5.2)   : Add `isAudioOnly` to `Participant`, added `gotEventSourcePing` event
                                            for eventstream, added UUID to `presentation_start` event
 - 7.5.1 (PexKit-SDK-2016-03-24_v7.5.1)   : Add support for Auto protocol, re-build for Xcode 7.3
 - 7.5.0 (PexKit-SDK-2016-03-02_v7.5.0)   : New WebRTC library and fixes for freeze in certain orientation
 - 7.4.16 (PexKit-SDK-2016-02-29_v7.4.16) : Update for v12 requiring event id for presentation
 - 7.4.15 (PexKit-SDK-2016-01-13_v7.4.15) : Ignore cache-control for API requests
 - 7.4.14 (PexKit-SDK-2015-11-26_v7.4.14) : Fix orientation/flip camera issues
 - 7.4.13 (PexKit-SDK-2015-11-23_v7.4.13) : Fix mute in landscape, add GW call to cal scraper,
                                            issues with ports and whitespace in display names
 - 7.4.10 (PexKit-SDK-2015-11-03_v7.4.10) : Better URI handling, reduce local video capture size
 - 7.4.9  (PexKit-SDK-2015-11-03)         : Added hardware acceleration
 - 7.4.8  (PexKit-SDK-2015-10-27)         : requestToken changes
