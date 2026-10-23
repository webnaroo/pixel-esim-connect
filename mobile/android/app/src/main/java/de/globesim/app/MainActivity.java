package de.globesim.app;

import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * GlobeSIM app shell.
 *
 * The shop itself is the live site https://globesim.de – nothing here changes it.
 * The shell adds what a phone app should do:
 *  1) the Android back button steps through the shop's pages instead of closing the app
 *  2) if the site cannot be reached, the app shows its own German page (with the offline eSIMs, if saved)
 *  3) optional fingerprint / device-PIN lock (setting: GlobeSimAppPlugin)
 */
public class MainActivity extends BridgeActivity {

    /** Page bundled inside the app, served from https://localhost/index.html */
    private static final String OFFLINE_PAGE = "https://localhost/index.html";

    /** Nach so langer Zeit im Hintergrund wird wieder gesperrt. */
    private static final long RELOCK_AFTER_MS = 30_000L;

    private static long unlockedAt = 0L;
    private long backgroundedAt = 0L;
    private boolean authInProgress = false;

    /** Eine gerade erfolgte Entsperrung (z. B. beim Einschalten) zählt, damit nicht sofort erneut gefragt wird. */
    static void markUnlocked() {
        unlockedAt = SystemClock.elapsedRealtime();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GlobeSimAppPlugin.class);
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        if (bridge != null) {
            bridge.setWebViewClient(new OfflineWebViewClient(bridge));
        }
        if (GlobeSimAppPlugin.isBiometricEnabled(this)) lock();
    }

    @Override
    public void onStop() {
        super.onStop();
        backgroundedAt = SystemClock.elapsedRealtime();
    }

    @Override
    public void onStart() {
        super.onStart();
        if (!GlobeSimAppPlugin.isBiometricEnabled(this) || authInProgress) return;
        long now = SystemClock.elapsedRealtime();
        boolean cameBack = backgroundedAt != 0L && now - backgroundedAt > RELOCK_AFTER_MS;
        if (cameBack && now - unlockedAt > RELOCK_AFTER_MS) lock();
    }

    private void lock() {
        final WebView view = getBridge() == null ? null : getBridge().getWebView();
        if (view == null || authInProgress || !GlobeSimAppPlugin.isBiometricAvailable(this)) return;
        authInProgress = true;
        view.setVisibility(View.INVISIBLE);
        BiometricPrompt prompt = new BiometricPrompt(this, ContextCompat.getMainExecutor(this), new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                authInProgress = false;
                markUnlocked();
                view.setVisibility(View.VISIBLE);
            }

            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                // Abgebrochen oder zu oft falsch: App schließen, Inhalt bleibt verdeckt.
                authInProgress = false;
                finishAndRemoveTask();
            }
        });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("GlobeSIM entsperren")
            .setAllowedAuthenticators(GlobeSimAppPlugin.AUTHENTICATORS)
            .build();
        prompt.authenticate(info);
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
