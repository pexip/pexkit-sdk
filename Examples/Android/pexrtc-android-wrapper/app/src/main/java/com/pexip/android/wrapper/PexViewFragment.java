package com.pexip.android.wrapper;


import android.app.Fragment;
import android.webkit.WebView;

/**
 * Created by darius on 05/10/2016.
 */
public class PexViewFragment extends Fragment {
    private PexView pexView;
    private WebView selfView;

    public PexViewFragment() {
        setRetainInstance(true);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        pexView.evaluateFunction("disconnect");
        pexView = null;
    }

    public PexView getPexView() {
        return pexView;
    }

    public WebView getSelfView() {
        return selfView;
    }

    public void setPexView(PexView pexView) {
        this.pexView = pexView;
    }

    public void setSelfView(WebView selfView) {
        this.selfView = selfView;
    }
}
