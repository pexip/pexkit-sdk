//
//  ViewController.swift
//  testingwebrtcframework
//
//  Created by Ian Mortimer on 09/12/2016.
//  Copyright © 2016 Pexip. All rights reserved.
//

import UIKit
import WebRTC

class ViewController: UIViewController,  UIPickerViewDataSource, UIPickerViewDelegate, RTCEAGLVideoViewDelegate {


    @IBOutlet var videoView: RTCEAGLVideoView!
    @IBOutlet weak var joinButton: UIButton!
    @IBOutlet weak var videoButton: UIButton!
    @IBOutlet weak var uriField: UITextField!
    var conference: Conference?
    var joined: Bool = false
    var escalated: Bool = false
    var resolution: Resolution = Resolution.wcif
    @IBOutlet weak var resPicker: UIPickerView!

    @IBAction func joinClicked(_ sender: UIButton) {

        if self.uriField.text! == "" {
            return
        }

        if !self.joined {
            self.conference = Conference(uriString: self.uriField.text!)
            print("Joining conference")
            self.conference?.tryToJoin { status in
                print("join status was \(status)")
                self.joined = true
                self.escalated = false
                self.setButtons(joined: self.joined, escalated: self.escalated)
            }
        } else {
            print("disconnecting")
            self.conference?.quit { status in
                print("Disconnect status was \(status)")
                self.joined = false
                self.escalated = false
                self.setButtons(joined: self.joined, escalated: self.escalated)
            }
        }
    }

    @IBAction func videoClicked(_ sender: UIButton) {

        // If you are making a gateway call (service_type will be gateway in request_token response)
        // you *must* escalate some form of media to trigger the other leg of the gateway to call out
        // to its target otherwise nothing will happen.
        
        if !self.escalated {
            print("Escalating")
            self.conference?.videoView = self.videoView

            self.conference?.tryToEscalate(video: true, resolution: self.resolution) { status in
                DispatchQueue.main.async {
                    print("Video status was \(status)")
                    self.escalated = true
                    self.setButtons(joined: self.joined, escalated: self.escalated)
                }
            }
        } else {
            print("Dropping media")
            self.conference?.disconnectMedia { status in
                print("disconnected media status was \(status)")
                self.escalated = false
                self.setButtons(joined: self.joined, escalated: self.escalated)
            }
        }
    }

    func setButtons(joined: Bool, escalated: Bool) {
        DispatchQueue.main.async {
            if joined == true {
                self.videoButton.isEnabled = true
                self.joinButton.setTitle("DISC", for: .normal)
            } else {
                self.videoButton.isEnabled = false
                self.joinButton.setTitle("JOIN", for: .normal)
            }
            if escalated == true {
                self.videoButton.setTitle("STOP", for: .normal)
            } else {
                self.videoButton.setTitle("VIDEO", for: .normal)
            }
        }
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        self.videoButton.isEnabled = false
        self.resPicker.dataSource = self
        self.resPicker.delegate = self
        self.videoView.delegate = self
        // Do any additional setup after loading the view, typically from a nib.
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

    public func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return Resolution.count
    }

    public func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return Resolution(rawValue: row)?.description
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        self.resolution = Resolution(rawValue: row)!
        print("resolution is now \(self.resolution)")
    }

    func videoView(_ videoView: RTCEAGLVideoView, didChangeVideoSize size: CGSize) {
        print("videoView was \(videoView) : MAIN is \(self.videoView) size was \(size)")
    }
}

