package com.pexip.example;

import android.opengl.GLSurfaceView;
import android.support.v7.app.ActionBarActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;

import com.pexip.pexkit.Conference;
import com.pexip.pexkit.IStatusResponse;
import com.pexip.pexkit.PexKit;
import com.pexip.pexkit.ServiceResponse;

import java.net.URI;

public class MainActivity extends ActionBarActivity {
    private Conference conference = null;
    private PexKit pexContext = null;
    private GLSurfaceView videoView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        try {
            videoView = (GLSurfaceView) findViewById(R.id.videoView);
            this.conference = new Conference("Android Example App", new URI("my.vmr@pexipdemo.com"), "");
	    // This will create a context with selfview in the top left (3% of width/height padding) that is 10% of width/height in size
            //this.pexContext = PexKit.createWithSelfview(getBaseContext(), (GLSurfaceView) findViewById(R.id.videoView), 3, 3, 10, 10);
            this.pexContext = PexKit.create(getBaseContext(), (GLSurfaceView) findViewById(R.id.videoView));
            // This will hide the selfview
            //this.pexContext.moveSelfView(0,0,0,0);
            Log.i("MainActivity", "done initializing pexkit");
        } catch (Exception e) {}

    }

    @Override
    public void onPause() {
        super.onPause();
        videoView.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        videoView.onResume();
    }
    public void onLogin(final View v) {
        ((Button) v).setEnabled(false);
        if (this.conference.isLoggedIn()) {
            Log.i("MainActivity", "about to release");
            conference.disconnectMedia(new IStatusResponse() {
                @Override
                public void response(ServiceResponse status) {
                    conference.releaseToken(new IStatusResponse() {
                        @Override
                        public void response(ServiceResponse status) {
                            Log.i("MainActivity", "release token status is " + status);
                            ((Button) v).setEnabled(true);
                        }
                    });
                }
            });

        } else {
            Log.i("MainActivity", "about to connect");
            this.conference.connect(new IStatusResponse() {
                @Override
                public void response(ServiceResponse status) {
                    conference.requestToken(new IStatusResponse() {
                        @Override
                        public void response(ServiceResponse status) {
                            Log.i("MainActivity", "req token status is " + status);
                            conference.escalateMedia(pexContext, new IStatusResponse() {
                                @Override
                                public void response(ServiceResponse status) {
                                    conference.setAudioMute(true);
                                    Log.i("MainActivity", "escalate call status is " + status);
                                    conference.listenForEvents();
				    conference.setAudioMute(true);
				    // examples of muting video and getting audio mute status
				    // conference.setVideoMute(true);
				    // conference.getAudioMute();
                                }
                            });
                            ((Button) v).setEnabled(true);
                        }
                    });
                }
            });
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }
}
