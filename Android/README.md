# Android Examples

The follow example is an Android Studio project that creates a very simple video client.

## Android Studio vs Eclipse

For the Android examples, we use Android studio and gradle.  If you're
using Eclipse ADT then you will need to add the following JAR files to
your lib:

1. [android-async-http](https://github.com/loopj/android-async-http) (try [MVN repository](http://mvnrepository.com/artifact/com.loopj.android/android-async-http/1.4.9) for a pre-built JAR file)
1. [Spotify DNS](https://github.com/spotify/dns-java) and its dependencies (try [MVN repository](http://mvnrepository.com/artifact/com.spotify/dns/3.0.2) for a pre-built JAR file)
1. [libjingle](https://github.com/pristineio/webrtc-android) and its dependencies (try [MVN repository](http://mvnrepository.com/artifact/io.pristine/libjingle) for a pre-built JAR file must be version: 10111)

See [this issue](https://github.com/pexip/pexkit-sdk/issues/4) for more details

## Changelog

  - PexKit-SDK-2015-12-15.aar  Changes for crashes on devices with no
                               front camera, cleanups to token request code and moving selfview
  - PexKit-SDK-2015-10-09.aar  Initial release
