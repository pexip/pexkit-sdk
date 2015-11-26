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

Be mindful of the device you are targetting when setting the
resolution as older devices e.g. iPhone 5 will struggle with the
higher resolutions.

## Changelog

 - 7.4.14 (PexKit-SDK-2015-11-26_v7.4.14) : Fix orientation/flip camera issues
 - 7.4.13 (PexKit-SDK-2015-11-23_v7.4.13) : Fix mute in landscape, add GW call to cal scraper,
                                            issues with ports and whitespace in display names
 - 7.4.10 (PexKit-SDK-2015-11-03_v7.4.10) : Better URI handling, reduce local video capture size
 - 7.4.9  (PexKit-SDK-2015-11-03)         : Added hardware acceleration
 - 7.4.8  (PexKit-SDK-2015-10-27)         : requestToken changes
