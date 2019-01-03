package com.attribes.pexiptest;

import android.app.Activity;
import android.content.Context;
import android.media.AudioManager;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.view.View;
import android.widget.Toast;


import com.attribes.pexiptest.databinding.FragmentCallBinding;
import com.pexip.android.wrapper.PexView;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;

/**
 * Author: shahabrauf
 * Date: 30/08/2018
 * Descrition:
 */
public class CallBaseActivity extends Activity {

    private int count = 0;
    protected boolean mic = true;
    protected boolean speaker = true;
    protected boolean video = true ;
    protected boolean selfVideo = true;
    FragmentCallBinding binding;
    PexView pexView;
    private AudioManager mAudioMgr;
    protected PexipCallInfo meetingData;
    private boolean callEnded = false;
    protected String pexCallType;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mAudioMgr = (AudioManager)getSystemService(Context.AUDIO_SERVICE);
    }

    protected void muteSpeaker() {
        if (speaker)
        {
            binding.speaker.setBackgroundResource(R.drawable.speaker_off);
            showMessage("Speakers off");
            mAudioMgr.setMode(AudioManager.MODE_IN_COMMUNICATION);
            mAudioMgr.setSpeakerphoneOn(false);
            mAudioMgr.setWiredHeadsetOn(true);

        } else {
            mAudioMgr.setWiredHeadsetOn(false);
            mAudioMgr.setSpeakerphoneOn(true);
            mAudioMgr.setMode(AudioManager.MODE_IN_COMMUNICATION);
            showMessage("Speakers on");
            binding.speaker.setBackgroundResource(R.drawable.speaker_onn);
        }

        speaker = !speaker;
    }

    private HashMap<String, String> getParams(){
        HashMap<String,String> params = new HashMap<>();
        params.put("streaming","true");
        params.put("remote_display_name","Amazon");
        return params;
    }

    protected void endCall(){
       if (!callEnded && shouldBackCall()) {
           disconnect();
       }
    }




    private void disconnect() {
        pexView.evaluateFunction("disconnect");
        finish();
    }



    protected void muteVideo() {
        if (video)
        {
            binding.videoCall.setBackgroundResource(R.drawable.video_recorder_off);
            pexView.evaluateFunction("muteVideo", true);
            showMessage("Video off");
            pexView.hideSelfView();


        } else {
            binding.videoCall.setBackgroundResource(R.drawable.video_recorder_onn);
            pexView.evaluateFunction("muteVideo", false);
            showMessage("Video on");
            pexView.showSelfView();

        }

        video = !video;
    }

    protected void muteMicroPhone() {
        if (mic)
        {
            binding.microPhone.setBackgroundResource(R.drawable.voice_recorder_off);
            pexView.evaluateFunction("muteAudio", true);
            showMessage("Microphone off");


        } else {
            binding.microPhone.setBackgroundResource(R.drawable.voice_recorder_on);
            pexView.evaluateFunction("muteAudio", false);
            showMessage("Microphone on");

        }

        mic = !mic;
    }

    protected void setPexipEvents() {

        pexView.setEvent("onError", pexView.new PexEvent() {
            @Override
            public void onEvent(String [] strings) {
               showMessage(strings[0]);
            }
        });

        pexView.setEvent("onDisconnect", pexView.new PexEvent() {
            @Override
            public void onEvent(String[] strings) {

            }
        });

        pexView.addPageLoadedCallback(pexView.new PexCallback() {
            @Override
            public void callback(String args) {
                pexView.setPin(meetingData.getPin(), null);
                pexView.evaluateFunction("makeCall", meetingData.getDomain(), meetingData.getAlias()
                        , "Test Attribes", "480");

            }

        });

    }

    private String parseHostFromURL(String urlString) {
        URL url = null;
        try {
            url = new URL(urlString);
            return url.getHost();

        } catch (MalformedURLException e) {
            e.printStackTrace();
        }
        return "";
    }

    protected boolean shouldBackCall(){
        if (count < 1){
            showMessage("Please tap again to exit");
            count ++;
            return false;
        } else {
            return true;
        }
    }

    /**
     * @usage It use to show any message provided by the caller
     * @param message
     */
    protected void showMessage(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }


    protected void hideControls() {
        binding.controls.setVisibility(View.GONE);
        binding.rightArrow.setVisibility(View.VISIBLE);
    }

    protected void showControls() {
        binding.rightArrow.setVisibility(View.GONE);
        binding.controls.setVisibility(View.VISIBLE);
    }
}
