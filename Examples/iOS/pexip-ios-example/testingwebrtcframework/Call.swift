//
//  Call.swift
//  TestingWebrtcImport
//
//  Created by Ian Mortimer on 08/12/2016.
//  Copyright © 2016 Pexip. All rights reserved.
//

import Foundation
import WebRTC



class Call: NSObject, RTCPeerConnectionDelegate {

    var factory: RTCPeerConnectionFactory? = nil
    var rtcConfg: RTCConfiguration? = nil
    var rtcConst: RTCMediaConstraints? = nil
    var peerConnection: RTCPeerConnection? = nil

    var videoTrack: RTCVideoTrack? = nil
    var audioTrack: RTCAudioTrack? = nil
    var mediaStream: RTCMediaStream? = nil
    var videoEnabled: Bool = false
    var videoView: RTCEAGLVideoView? = nil
    var connected = false

    var resolution: Resolution? = nil

    var localSdpCompletion: (RTCSessionDescription) -> Void
    var remoteSdpCompletion: ((NSError?) -> Void)? = nil
    var uuid: UUID?


    init(uri: URI, videoView: RTCEAGLVideoView, videoEnabled: Bool, resolution: Resolution, completion: @escaping (RTCSessionDescription) -> Void) {

        print("Creating call")
        RTCInitializeSSL()

        self.factory = RTCPeerConnectionFactory()

        self.resolution = resolution

        self.videoView = videoView

        self.videoEnabled = videoEnabled

        self.rtcConfg = RTCConfiguration()

        // Set this to maxCompat for correct operation with Pexip MCU
        self.rtcConfg?.bundlePolicy = RTCBundlePolicy.maxCompat

        // If your ICE servers need credentials, create them in here as RTCIceServer objects
        self.rtcConfg?.iceServers = []

        print("Setting constraints with videoEnabled: \(self.videoEnabled)")
        
        self.rtcConst = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio" : "true",
                "OfferToReceiveVideo" : self.videoEnabled ? "true" : "false"
            ],
            optionalConstraints: [:]
        )

        // Empty set of constraints if we want them, will set the WebRTC library
        // to use its defaults from the peer connection factory
        // 
        // let emptyConstraints = RTCMediaConstraints(mandatoryConstraints: [:], optionalConstraints: [:])

        self.localSdpCompletion = completion
        super.init()

        self.peerConnection = self.factory?.peerConnection(with: rtcConfg!, constraints: rtcConst!, delegate: self)

        self.mediaStream = self.factory?.mediaStream(withStreamId: "PEXIP")

        if self.videoEnabled {
            print("Call adding video")
            // set your outbound "resolution" constraints here e.g. minWidth and maxWidth settings for outbound resolution
            // let mandatory = ["minWidth":"192"]
            let constraints = RTCMediaConstraints.init(mandatoryConstraints: [:], optionalConstraints: [:])
            let videoSource = self.factory?.avFoundationVideoSource(with: constraints)
            self.videoTrack = self.factory?.videoTrack(with: videoSource!, trackId: "PEXIPv0")
            self.mediaStream?.addVideoTrack(self.videoTrack!)
        }
        self.audioTrack = self.factory?.audioTrack(withTrackId: "PEXIPa0")

        self.mediaStream?.addAudioTrack(self.audioTrack!)

        self.peerConnection?.add(self.mediaStream!)

        print("About to offer")
        // this is effectively the session description delegate stuff from previous releases
        self.peerConnection?.offer(for: self.rtcConst!, completionHandler: offerCompletionHandler)

    }

    func offerCompletionHandler(rtcSessionDescription: RTCSessionDescription?, error: Error?) {

        if error != nil {
            // do something with the error
            print("error with completion handler for RTCSessionDescription: \(error?.localizedDescription)")
        } else {
            self.peerConnection?.setLocalDescription(rtcSessionDescription!) { error in
                print("got error: \(error)")
            }
            print("got OK for offer completion handler for RTCSessionDescription")
        }
    }

    func setRemoteSdp(sdp: RTCSessionDescription, completion: @escaping (_ error: Error?) -> Void) {
        print("mutating remote SDP bandwidth")
        let mutated = self.mutateSdpToBandwidth(sdp: sdp)
        self.peerConnection?.setRemoteDescription(mutated) { error in
            print("Setting remote SDP on connection, status: \(error)")
            self.remoteSdpCompletion = completion
            completion(nil)
        }
    }

    // RTCPeerConnectionDelegate functions

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("peer connection stateChanged")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        print("peer connection didAddStream")
        if stream.videoTracks.count > 0 && self.videoEnabled {
            print("Got video track")
            self.videoTrack = stream.videoTracks[0]
            self.videoTrack?.add(self.videoView!)
        }
        if stream.audioTracks.count > 0 {
            print("Got audio track")
            self.audioTrack = stream.audioTracks[0]
            // at this point you should be able to route media to different audio
            // outputs - see docs.
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        print("peer connection didRemoveStream")
    }

    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("peer connection should neg")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        if newState.rawValue == RTCIceConnectionState.connected.rawValue {
            print("We've established media")
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        if newState.rawValue == RTCIceGatheringState.complete.rawValue {
            print("We've completed ICE gathering, send up the completed SDP")
            // Now we can mangle the SDP to set the correct resolution settings
            let mutated = self.mutateSdpToBandwidth(sdp: (self.peerConnection?.localDescription)!)
            self.localSdpCompletion(mutated)
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        print("generate ice candidate")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        print("removed ice candidate")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        print("opened datachannel")
    }

    // SDP Mangling for BW/Resolution stuff

    private func mutateSdpToBandwidth(sdp: RTCSessionDescription) -> RTCSessionDescription {
        let h264BitsPerPixel = 0.06
        let fps = 30.0
        // if using AAC-LD --> 128.0
        let audioBw = 64.0
        let videoBw = Double(self.resolution!.width()) * Double(self.resolution!.height()) * fps * h264BitsPerPixel
        let asValue = Int((videoBw / 1000) + audioBw)
        let tiasValue = Int(videoBw + audioBw)
        let range = sdp.sdp.range(of: "m=video.*\\r\\nc=IN.*\\r\\n", options: .regularExpression)
        var origSdp = sdp.sdp
        let bwLine = "b=AS:\(asValue)\r\nb=TIAS:\(tiasValue)\r\n"
        if range != nil {
            origSdp.insert(contentsOf: bwLine.characters, at: range!.upperBound)
            return RTCSessionDescription(type: sdp.type, sdp: origSdp)
        } else {
            return sdp
        }

    }
}

// Simple class to define a conference URI.  This is a very basic implemention
// and should be expaned to account for all conference URI variances including
// things like protocols being added to the front (e.g. SIP, H323 etc) and port
// numbers being added to the end
class URI {

    var conference: String? = nil
    var host: String? = nil
    var raw: String

    public init?(raw: String) {

        self.raw = raw

        let components = raw.components(separatedBy: "@")

        switch components.count {
        case 1:
            self.conference = components[0]
            return
        case 2:
            let host = components[1].components(separatedBy: CharacterSet(charactersIn: ":;")).first
            let conf = components[0].components(separatedBy: CharacterSet(charactersIn: ":;")).last
            self.conference = conf
            self.host = host
            return
        default:
            return nil
        }
    }
    
}

// Although not really a "resolution", this is a simple way to provide a notion of
// quality or bandwidth for a call.
public enum Resolution: Int, CustomStringConvertible {
    case wcif, p448, p576, hd

    public func width() -> Int {
        switch (self) {
        case .wcif:
            return 512
        case .p448:
            return 768
        case .p576:
            return 1024
        case .hd:
            return 1280
        }
    }

    public func height() -> Int {
        switch (self) {
        case .wcif:
            return 288
        case .p448:
            return 448
        case .p576:
            return 576
        case .hd:
            return 720
        }
    }

    public func maxFs() -> Int {
        let maxFs = (self.width() * self.height()) / (16 * 16)
        return maxFs
    }

    public func maxMbps() -> Int {
        return (self.maxFs() * 30)
    }

    public var description: String {
        switch (self) {
        case .wcif: return "wCIF"
        case .p448: return "448p"
        case .p576: return "576p"
        case .hd: return "720p"
        }
    }

    static let count: Int = {
        var max: Int = 0
        while let _ = Resolution(rawValue: max) { max += 1 }
        return max
    }()
}

