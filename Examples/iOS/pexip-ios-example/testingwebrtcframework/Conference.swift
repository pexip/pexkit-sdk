//
//  Conference.swift
//  Pexip Native App Example
//
//  Created by Ian Mortimer on 29/11/2016.
//  Copyright © 2016 Pexip. All rights reserved.
//

import Foundation
import WebRTC

// Simple enum to pass back errors to the application
enum ServiceError {
    case ok, pinRequired, guestOnly, invalidPin, badRequest, error
}

class Conference {

    var uri: URI
    var displayName: String = "DemoApp"
    var tokenResp: [String: AnyObject]?
    var token: String?
    var pin: String?
    var rosterList: [Participant] = []
    var call: Call?
    var dyingCall: Call?
    var queue = DispatchQueue(label: "com.pexip.demoapp")
    var eventSource: EventSource?
    var refreshTimer: Timer?
    var myParticipantUUID: UUID?

    var videoView: RTCEAGLVideoView?

    var queryTimeout: TimeInterval = 7
    var callQueryTimeout: TimeInterval = 62

    var httpAuth: String?

    let baseUri = "/api/client/v2/conferences/"

    init(uriString: String) {
        self.uri = URI(raw: uriString)!

        // Add some http auth if required
        let hash = "user:password"
        let hashData = hash.data(using: String.Encoding.ascii, allowLossyConversion: false)
        let finalHash = NSString(data: hashData!.base64EncodedData(), encoding: String.Encoding.utf8.rawValue)
        self.httpAuth = "Basic \(finalHash!)"

    }

    func tryToJoin(completion: @escaping (ServiceError) -> Void) {
        print("Attempting to join conference \(self.uri.conference)")

        self.requestToken() { token in
            guard let token = token else {
                return
            }
            // Documentation https://docs.pexip.com/api_client/api_rest.htm#request_token
            print(token)

            if token["status"] as! String == "success" {
                if let hostPin = token["result"]?["pin"] as? String {

                    // Looks like we need PIN's - check if guests and / or hosts require them
                    // See https://docs.pexip.com/admin/pins_hosts_guests.htm for more information

                    if hostPin.lowercased() == "required" {
                        if let guestPin = token["result"]?["guest_pin"] as? String {
                            // If guest pin is none, they can select guest role and sit in waiting room
                            // otherwise they have to enter their guest pin if its required
                            completion(guestPin.lowercased() == "none" ? ServiceError.guestOnly : ServiceError.pinRequired)
                        } else {
                            completion(ServiceError.pinRequired)
                        }
                    }
                } else {
                    print("OK, we're in")

                    self.tokenResp = token["result"] as! [String : AnyObject]?
                    self.token = self.tokenResp?["token"] as? String

                    // At this point you could store the token information for later usage.
                    // For now let's stash the participant_uuid (needed later for participant operations)

                    let uuidString = self.tokenResp?["participant_uuid"] as! String
                    self.myParticipantUUID = UUID(uuidString: uuidString)

                    // Let's setup a timer to refresh the token
                    // Documentation https://docs.pexip.com/api_client/api_rest.htm#refresh_token
                    if let expires = self.tokenResp?["expires"] as? String,
                        let exp = Int(expires) {
                        DispatchQueue.main.async {
                            self.refreshTimer = Timer.scheduledTimer(timeInterval: TimeInterval(exp/4), target: self, selector: .refreshSelector, userInfo: nil, repeats: true);
                        }
                    } else {
                        print("Failed to create timer")
                    }

                    // And let's connect to the event stream
                    // Documentation https://docs.pexip.com/api_client/api_rest.htm?#server_sent
                    self.listenForEvents(failOnError: false)

                    completion(ServiceError.ok)
                }
            } else {
                print("failed")
                if let result = token["result"] as? String {
                    if result.lowercased() == "invalid pin" {
                        completion(ServiceError.invalidPin)
                    } else {
                        completion(ServiceError.error)
                    }

                }
            }
        }
    }

    func requestToken(completion: @escaping ([String: AnyObject]?) -> Void) {

        // Documentation https://docs.pexip.com/api_client/api_rest.htm#request_token

        // For proper operation, you should perform an SRV lookup as defined here:
        // https://docs.pexip.com/end_user/guide_for_admins/configuring_dns_pexip_app.htm
        // Then connect to the host that is returned from the lookup rather than the domain
        // in the URI

        guard let url = URL(string: "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/request_token?display_name=\(self.displayName)")  else {
            print("failed to build request token URL")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = self.queryTimeout
        request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
        if let auth = self.httpAuth {
            request.addValue(auth, forHTTPHeaderField: "Authorization")
        }
        if let pin = self.pin {
            request.addValue(pin, forHTTPHeaderField: "pin")
        }
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            do {
                guard error == nil else {
                    print("error with request: \(error)")
                    return
                }
                guard let data = data else {
                    print("no data in response")
                    return
                }
                guard let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: AnyObject] else {
                    print("error trying to convert data to JSON")
                    return
                }
                completion(json)
            } catch {
                print("Got error with request")
            }
        }
        task.resume()
    }

    @objc func refreshToken(timer: Timer) {

        // Documentation https://docs.pexip.com/api_client/api_rest.htm#refresh_token

        guard let url = URL(string: "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/refresh_token")  else {
            print("failed to build refresh token URL")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = self.queryTimeout
        request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
        if let auth = self.httpAuth {
            request.addValue(auth, forHTTPHeaderField: "Authorization")
        }
        if let pin = self.pin {
            request.addValue(pin, forHTTPHeaderField: "pin")
        }
        if let token = self.token {
            request.addValue(token, forHTTPHeaderField: "token")
        }
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            do {
                guard error == nil else {
                    print("error with request: \(error)")
                    return
                }
                guard let data = data else {
                    print("no data in response")
                    return
                }
                guard let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: AnyObject] else {
                    print("error trying to convert data to JSON")
                    return
                }
                if let status = json["status"] as? String {
                    if status.lowercased() == "success" {
                        if let result = json["result"] as? [String: AnyObject] {
                            self.token = result["token"] as? String
                        }
                    }
                }
                print(" -- token refreshed --")
            } catch {
                print("Got error with refresh")
            }
        }
        task.resume()
    }

    func listenForEvents(failOnError: Bool) {

        // Documentation https://docs.pexip.com/api_client/api_rest.htm?#server_sent

        let path = "/api/client/v2/conferences/\(self.uri.conference!)/events"
        let urlStr = "https://\(self.uri.host!)\(path)"
        var headers: [String:String] = [:]
        if let auth = self.httpAuth {
            headers["Authorization"] = auth
        }
        if let token = self.token {
            headers["token"] = token
        }
        print("Creating event source...")
        self.eventSource = EventSource(url: urlStr, headers: headers)

        self.eventSource?.onOpen {
            print("Event source opened")
        }

        self.eventSource?.onError { (error) in
            print("Event source error")
        }

        self.eventSource?.onMessage { (id, event, data) in
            print("Got message \(event) with id \(id) and it contained \(data)")
        }

    }

    func tryToEscalate(video: Bool, resolution: Resolution, completion: @escaping (ServiceError) -> Void) {
        print("Creating call object")

        self.call = Call(uri: self.uri, videoView: self.videoView!, videoEnabled: video, resolution: resolution) { sdp in

            print("Call object said our SDP is: \(sdp)")

            // Let's offer our SDP to the MCU using the participant function "call" on the API
            // https://docs.pexip.com/api_client/api_rest.htm?#calls

            let callOffer = [
                "call_type": "WEBRTC",
                "sdp": sdp.sdp
            ]
            let uuidString = self.myParticipantUUID!.uuidString.lowercased()
            let urlString = "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/participants/\(uuidString)/calls"
            let jsonBody = try? JSONSerialization.data(withJSONObject: callOffer, options: [])
            guard let url = URL(string: urlString)  else {
                print("failed to build escalate URL")
                return
            }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            // The timeout here is greater as it can take up to 60s for the MCU 
            // to timeout the outbound call if it doesn't reach a participant so
            // we need to give it time to return a failure response to us rather
            // than timing out the request ourselves
            // You could use something like:
            //   let action = url.lastPathComponent?.characters.split{$0 == "?"}.map(String.init)
            //   let timeout = action![0] == "calls" ? self.callsQueryTimeout : self.queryTimeout
            // in a generic "request" function for all calls to differentiate
            // between call and non-call API queries
            request.timeoutInterval = self.callQueryTimeout
            request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
            request.addValue("application/json", forHTTPHeaderField: "Content-type")
            request.httpBody = jsonBody
            if let auth = self.httpAuth {
                request.addValue(auth, forHTTPHeaderField: "Authorization")
            }

            if let pin = self.pin {
                request.addValue(pin, forHTTPHeaderField: "pin")
            }
            if let token = self.token {
                request.addValue(token, forHTTPHeaderField: "token")
            }
            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                do {
                    guard error == nil else {
                        print("error with request: \(error)")
                        return
                    }
                    guard let data = data else {
                        print("no data in response")
                        return
                    }
                    guard let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: AnyObject] else {
                        print("error trying to convert data to JSON")
                        return
                    }
                    if let status = json["status"] as? String {
                        if status.lowercased() == "success" {
                            if let result = json["result"] as? [String: AnyObject] {

                                // We should now have SDP and a new call uuid

                                let uuidString = result["call_uuid"] as! String
                                self.call?.uuid = UUID(uuidString: uuidString)
                                let remoteSdp = result["sdp"] as! String
                                print("Their SDP is: \(remoteSdp)")

                                print("Setting remote SDP on call object")
                                // Let's send their SDP back into the machine
                                self.call?.setRemoteSdp(sdp: RTCSessionDescription(type: RTCSdpType.answer, sdp: remoteSdp)) { status in

                                    // check status and ACK the request to start the media flow
                                    // See https://docs.pexip.com/api_client/api_rest.htm?#ack

                                    print("status for remote SDP was \(status)")
                                    self.ack()

                                    completion(.ok)
                                }
                            }
                        }
                    }
                } catch {
                    print("Got error with call SDP")
                }
            }
            task.resume()

        }
    }


    func ack() {

        // Ack the call to start media
        // Documentation: https://docs.pexip.com/api_client/api_rest.htm?#ack

        let uuidString = self.myParticipantUUID!.uuidString.lowercased()
        let urlString = "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/participants/\(uuidString)/calls/\(self.call!.uuid!.uuidString.lowercased())/ack"
        guard let url = URL(string: urlString)  else {
            print("failed to build ack URL")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
        if let auth = self.httpAuth {
            request.addValue(auth, forHTTPHeaderField: "Authorization")
        }


        if let token = self.token {
            request.addValue(token, forHTTPHeaderField: "token")
        }
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            print("doing")
            guard error == nil else {
                print("error with request: \(error)")
                return
            }
            print("Call \(self.call!.uuid!.uuidString.lowercased()) acknowledged")
        }
        task.resume()
    }

    func disconnectMedia(completion: @escaping (ServiceError) -> Void) {
        print("Tearing down call and media")

        // Bring down the call
        // Documentation: https://docs.pexip.com/api_client/api_rest.htm#call_disconnect

        let uuidString = self.myParticipantUUID!.uuidString.lowercased()
        let callUUIDString = self.call!.uuid!.uuidString.lowercased()
        let urlString = "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/participants/\(uuidString)/calls/\(callUUIDString)/disconnect"
        guard let url = URL(string: urlString)  else {
            print("failed to build disconnect URL")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
        if let auth = self.httpAuth {
            request.addValue(auth, forHTTPHeaderField: "Authorization")
        }

        if let pin = self.pin {
            request.addValue(pin, forHTTPHeaderField: "pin")
        }
        if let token = self.token {
            request.addValue(token, forHTTPHeaderField: "token")
        }
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard error == nil else {
                print("error with request: \(error)")
                return
            }
            // ignoring status here, we could parse it if we wanted to
            print("call disconnected")

            DispatchQueue.main.async {
                self.call?.peerConnection?.remove((self.call?.mediaStream)!)
                self.call?.mediaStream = nil
                self.call?.audioTrack = nil
                self.call?.videoTrack = nil

                self.call?.peerConnection?.close()
                self.call?.peerConnection = nil
                self.call?.videoView = nil
                self.call?.factory = nil
                RTCCleanupSSL()
            }
            completion(.ok)
        }
        task.resume()
    }

    func quit(completion: @escaping (ServiceError) -> Void) {

        // Quit the conference by releasing the token
        // Documentation: https://docs.pexip.com/api_client/api_rest.htm?#release_token


        if self.call != nil {
            self.disconnectMedia { status in
                print("Disconnected media stack")
            }
        }

        // Cancel the refresh timer, we're done
        DispatchQueue.main.async {
            print("Cancelled token refresh timer")
            self.refreshTimer?.invalidate()

            // Close down the event source
            self.eventSource!.close()

        }

        let urlString = "https://\(self.uri.host!)\(self.baseUri)\(self.uri.conference!)/release_token"
        guard let url = URL(string: urlString)  else {
            print("failed to build release URL")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.cachePolicy = URLRequest.CachePolicy.reloadIgnoringCacheData
        if let auth = self.httpAuth {
            request.addValue(auth, forHTTPHeaderField: "Authorization")
        }
        if let token = self.token {
            request.addValue(token, forHTTPHeaderField: "token")
        }
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard error == nil else {
                print("error with request: \(error)")
                return
            }
            print("Token released, event source closed, we're outta here")
            completion(.ok)
        }
        task.resume()
    }
    
    func tryToPresent(completion: @escaping (ServiceError) -> Void) {
        completion(.ok)
    }
    
}

// A small class to store our participants.  You could store much more information
// here that you receive from the API
class Participant {
    var name: String
    var uri: String
    var uuid: UUID

    init(name: String, uri: String, uuid: UUID) {
        self.name = name
        self.uri = uri
        self.uuid = uuid
    }
}

private extension Selector {
    static let refreshSelector =
        #selector(Conference.refreshToken(timer:))    
}
