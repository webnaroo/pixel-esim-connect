package de.globesim.app;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * GlobeSIM app shell.
 *
 * The shop itself is the live site https://globesim.de – nothing here changes it.
 * These two additions only make the shell behave like a normal phone app:
 *  1) the Android back button steps through the shop's pages instead of closing the app
 *  2) if the site cannot be reached, the app shows its own German notice with a retry button
 */
public class MainActivity extends BridgeActivity {

    /** Page bundled inside the app, served from https://localhost/index.html */
    private static final String OFFLINE_PAGE = "https://localhost/index.html";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        if (bridge != null) {
            bridge.setWebViewClient(new OfflineWebViewClient(bridge));
        }
    }

    @Override
    public void onBackPressed() {
        WebView view = getBridge() == null ? null : getBridge().getWebView();
        if (view != null && view.canGoBack()) {
            view.goBack();
            return;
        }
        super.onBackPressed();
    }

    private static class OfflineWebViewClient extends BridgeWebViewClient {

        OfflineWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request != null && request.isForMainFrame()) {
                view.loadUrl(OFFLINE_PAGE);
                return;
            }
            super.onReceivedError(view, request, error);
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            view.loadUrl(OFFLINE_PAGE);
        }
    }
}
