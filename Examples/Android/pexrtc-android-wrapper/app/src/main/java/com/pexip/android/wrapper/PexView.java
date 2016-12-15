package com.pexip.android.wrapper;

import android.content.Context;
import android.graphics.Color;
import android.util.AttributeSet;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by darius on 26/09/2016.
 */

public class PexView extends WebView{
    private List<PexCallback> readyCallbacks;
    private WebView selfView;
    private PexCallback finishedCallback;
    private boolean ready = false;
    private Integer numFinishedCallbacks = 0;
    private String fetchHost;

    public PexView(Context context) {
        super(context);
        init();
    }

    public PexView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public PexView(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        init();
    }


    private void init() {
        readyCallbacks = new ArrayList<PexCallback>();
        setupWebView(this);
        this.setWebViewClient(new WebViewClient() {
            public void onPageFinished(WebView view, String url)
            {
                if (fetchHost != null) {
                    view.evaluateJavascript("fetchPexRTCSource(" + (fetchHost != null ? "'"+ fetchHost +"'" : "") + ")", null);
                } else {
                    runCallbacks();
                }
            }
        });
        this.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
    }

    public void load() {
        this.loadUrl("file:///android_asset/index.html");
    }

    public void addPageLoadedCallback(PexCallback readyCallback) {
        readyCallbacks.add(readyCallback);
    }

    public void setFinishedCallback(PexCallback callback) {
        finishedCallback = callback;
    }

    public <T> void setInstanceVariable(String name, T value) {
        setInstanceVariable(name, null, value);
    }

    public <T> void setInstanceVariable(String name, PexCallback cb, T value) {
        String function;
        final PexCallback callback = cb;
        if (value instanceof String) {
            function = "setInstanceVariable('" + name + "', '" + value + "');";
        } else {
            function = "setInstanceVariable('" + name + "', " + value + ");";
        }
        this.evaluateJavascript(function, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (callback != null)
                    callback.runOnUI(null);

            }

        });
    }

    public void getField(String name, PexCallback cb) {
        final PexCallback callback = cb;
        this.evaluateJavascript("(function() { return getField('" + name + "'); })();", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                callback.runOnUI(value);
            }
        });
    }

    public <T> void evaluateFunction(String name, T... args) {
        evaluateFunction(name, null, args);
    }

    public <T> void evaluateFunction(String name, PexCallback cb, T... args) {
        StringBuilder sb = new StringBuilder();
        final PexCallback callback = cb;
        sb.append("evaluateFunction('" + name + "'");
        for (T element : args) {
            if (element instanceof String) {
                sb.append(", '" + element + "'");
            } else {
                sb.append(", " + element);
            }
        }
        sb.append(")");
        this.evaluateJavascript("(function() { return " + sb.toString() + " })();", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (callback != null)
                    callback.runOnUI(value);
            }

        });
    }

    public void setEvent(String name, PexEvent event) {
        setEvent(name, event, null);
    }

    public void setEvent(final String name, final PexEvent event, final PexCallback callback) {
        if (event != null)
            this.addJavascriptInterface(event, name);

        readyCallbacks.add(new PexCallback() {
            @Override
            public void callback(String returnValue) {
                PexView.this.evaluateJavascript("setEvent('" + name + "');", new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (callback != null) {
                            callback.runOnUI(null);
                        }
                    }

                });

            }
        });
    }

    private void callbackFinished() {
        if (!ready) {
            numFinishedCallbacks++;
            if (numFinishedCallbacks >= readyCallbacks.size()) {
                ready = true;
                if (finishedCallback != null)
                    finishedCallback.runOnUI(null);
            }
        }
    }

    public void setVideo(String url) {
        setVideo(url, null);
    }

    public void setVideo(String url, final PexCallback cb) {
        this.evaluateJavascript("loadVideo('" + url + "')", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (cb != null)
                    cb.runOnUI(null);
            }
        });
    }

    public void setSelfView(WebView webView) {
        selfView = webView;
        setupWebView(webView);
    }

    public WebView getSelfView() {
        return selfView;
    }

    public WebView setSelfViewVideo(String url) {
        if (selfView == null) {
            selfView = new WebView(this.getContext());
            setupWebView(selfView);
        }

        selfView.loadUrl("file:///android_asset/self_view.html?" + url);
        return selfView;
    }

    public void fetchPexRTCSource() {
        fetchPexRTCSource(null, null);
    }

    public void fetchPexRTCSource(String host) {
        fetchPexRTCSource(host, null);
    }

    public void fetchPexRTCSource(PexEvent cb) {
        fetchPexRTCSource(null, cb);
    }

    public void fetchPexRTCSource(String host, final PexEvent cb){
        this.addJavascriptInterface(new PexEvent() {
            @Override
            public void onEvent(String[] returnValues) {
                if (cb != null)
                    cb.runOnUI(null);

                runCallbacks();
            }
        }, "fetchCallback");

        fetchHost = host;
    }

    public abstract class PexCallback {

        public abstract void callback(String returnValue);

        public void runOnUI(final String returnValue) {
            PexView.this.post(new Runnable() {
                @Override
                public void run() {
                    callback(returnValue);
                    PexView.this.callbackFinished();
                }
            });
        }
    }

    public abstract class PexEvent {

        public abstract void onEvent(String[] returnValues);

        @JavascriptInterface
        public void runOnUI(final String[] returnValues) {
            PexView.this.post(new Runnable() {
                @Override
                public void run() {
                    onEvent(returnValues);
                }
            });
        }
    }

    private void setupWebView(WebView webView) {
        WebSettings settings = webView.getSettings();
        webView.setBackgroundColor(Color.TRANSPARENT);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
    }

    private void runCallbacks() {
        for (PexCallback callback : readyCallbacks) {
            callback.runOnUI(null);
        }
        if (readyCallbacks.size() == 0) {
            callbackFinished();
        }
    }
}
