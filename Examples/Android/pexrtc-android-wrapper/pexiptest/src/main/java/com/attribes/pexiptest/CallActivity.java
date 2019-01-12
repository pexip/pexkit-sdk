package com.attribes.pexiptest;

import android.databinding.DataBindingUtil;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.View;

/**
 * Author: shahabrauf
 * Date: 29/08/2018
 * Descrition:
 */
public class CallActivity extends CallBaseActivity {

    String TAG = "CallActivity";
    private boolean sideMenu = false;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = DataBindingUtil.setContentView(this, R.layout.fragment_call);
        pexView =  findViewById(R.id.pexView);
        //pexView.setSelfView(binding.selfView);
        getIntentData();
        setPexipEvents();
        setListeners();
        // Load the page which will then trigger the callbacks
        pexView.load();
    }

    private void getIntentData(){
        meetingData = new PexipCallInfo();
        meetingData.setDomain("Set your domain here"); // e.g : cloud.example.com
        meetingData.setPin("Set your pin here"); // e.g : 123456
        meetingData.setAlias("Set your alias here"); // e.g : shahab@example.com
        Log.d(TAG, meetingData.getAlias()+ " " +
                meetingData.getDomain()+ " " +
                meetingData.getPin());
    }

    private void setListeners() {
        binding.microPhone.setOnClickListener(clickListener);
        binding.videoCall.setOnClickListener(clickListener);
        binding.speaker.setOnClickListener(clickListener);
        binding.end.setOnClickListener(clickListener);
        binding.rightArrow.setOnClickListener(clickListener);
        binding.backArrow.setOnClickListener(clickListener);
    }

    View.OnClickListener clickListener = new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            switch (view.getId())
            {
                case R.id.speaker:
                    muteSpeaker();
                    break;
                case R.id.microPhone:
                    muteMicroPhone();
                    break;
                case R.id.videoCall:
                    muteVideo();
                    break;
                case R.id.end:
                    endCall();
                    break;
                case R.id.rightArrow:
                    showControls();
                    break;
                case R.id.backArrow:
                    hideControls();
                    break;
            }
        }
    };


    @Override
    public void onDestroy() {
        super.onDestroy();
        endCall();
    }

    @Override
    public void onBackPressed() {
        endCall();
    }

}
