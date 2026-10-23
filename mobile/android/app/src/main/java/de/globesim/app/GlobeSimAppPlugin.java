package de.globesim.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.content.SharedPreferences;

import androidx.annotation.Nullable;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricManager.Authenticators;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * App-eigene Funktionen für die GlobeSIM-Webseite (nur in der Android-App):
 *  - Fingerabdruck-/Geräte-PIN-Sperre (Einstellung hier, Sperre selbst in MainActivity)
 *  - verschlüsselte Offline-Kopie der eSIMs (QR-Code und Installationsdaten)
 * Die Webseite ruft das über window.Capacitor auf (siehe src/lib/native-app.ts).
 */
@CapacitorPlugin(name = "GlobeSimApp")
public class GlobeSimAppPlugin extends Plugin {

    private static final String PREFS = "globesim_app";
    private static final String SECURE_PREFS = "globesim_secure";
    private static final String KEY_BIOMETRIC = "biometric_lock";
    private static final String KEY_OFFLINE = "offline_enabled";
    private static final String KEY_OFFLINE_SAVED_AT = "offline_saved_at";
    private static final String KEY_SNAPSHOT = "offline_snapshot";
    private static final int MAX_SNAPSHOT_CHARS = 1_500_000;
    // LPA:1$<SM-DP+-Adresse>$<Aktivierungscode>[$<Bestätigungscode>]
    private static final java.util.regex.Pattern LPA_PATTERN = java.util.regex.Pattern.compile("^LPA:1\\$[A-Za-z0-9.\\-]{3,255}(\\$[A-Za-z0-9._\\-]{0,128}){0,2}$");

    /** Gleiche Regel wie in MainActivity: Fingerabdruck oder Gesicht, ersatzweise Geräte-PIN. */
    static final int AUTHENTICATORS = Authenticators.BIOMETRIC_WEAK | Authenticators.DEVICE_CREDENTIAL;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isBiometricEnabled(Context c) {
        return prefs(c).getBoolean(KEY_BIOMETRIC, false);
    }

    static boolean isBiometricAvailable(Context c) {
        return BiometricManager.from(c).canAuthenticate(AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    /** Push geht nur, wenn die App mit google-services.json (Firebase) gebaut wurde. */
    static boolean isPushConfigured(Context c) {
        try {
            Class<?> k = Class.forName("com.google.firebase.FirebaseApp");
            java.util.List<?> apps = (java.util.List<?>) k.getMethod("getApps", Context.class).invoke(null, c);
            return apps != null && !apps.isEmpty();
        } catch (Throwable t) {
            return false;
        }
    }

    @Nullable
    private SharedPreferences secure() {
        Context c = getContext();
        try {
            return openSecure(c);
        } catch (Exception first) {
            // Schlüssel oder Datei beschädigt (z. B. nach Geräte-Wiederherstellung): neu anlegen.
            try {
                deleteSecure(c);
                return openSecure(c);
            } catch (Exception second) {
                return null;
            }
        }
    }

    /** Löscht die verschlüsselte Datei (Context.deleteSharedPreferences gibt es erst ab Android 7). */
    private static void deleteSecure(Context c) {
        c.getSharedPreferences(SECURE_PREFS, Context.MODE_PRIVATE).edit().clear().commit();
        new java.io.File(c.getApplicationInfo().dataDir, "shared_prefs/" + SECURE_PREFS + ".xml").delete();
    }

    private static SharedPreferences openSecure(Context c) throws Exception {
        MasterKey key = new MasterKey.Builder(c).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
        return EncryptedSharedPreferences.create(
            c,
            SECURE_PREFS,
            key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Context c = getContext();
        SharedPreferences p = prefs(c);
        JSObject ret = new JSObject();
        ret.put("pushAvailable", isPushConfigured(c));
        ret.put("biometricAvailable", isBiometricAvailable(c));
        ret.put("biometricEnabled", isBiometricEnabled(c));
        ret.put("offlineEnabled", p.getBoolean(KEY_OFFLINE, false));
        ret.put("offlineSavedAt", p.getString(KEY_OFFLINE_SAVED_AT, null));
        call.resolve(ret);
    }

    @PluginMethod
    public void setBiometricEnabled(final PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        final Context c = getContext();
        if (!enabled) {
            prefs(c).edit().putBoolean(KEY_BIOMETRIC, false).apply();
            JSObject ret = new JSObject();
            ret.put("enabled", false);
            call.resolve(ret);
            return;
        }
        if (!isBiometricAvailable(c)) {
            call.reject("Auf diesem Gerät ist keine Displaysperre oder kein Fingerabdruck eingerichtet.");
            return;
        }
        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("Die Sperre ist gerade nicht verfügbar.");
            return;
        }
        final FragmentActivity activity = (FragmentActivity) getActivity();
        // Zur Bestätigung einmal entsperren, damit niemand versehentlich ausgesperrt wird.
        activity.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(c), new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    prefs(c).edit().putBoolean(KEY_BIOMETRIC, true).apply();
                    // Die gerade erfolgte Entsperrung zählt: nicht sofort erneut sperren.
                    MainActivity.markUnlocked();
                    JSObject ret = new JSObject();
                    ret.put("enabled", true);
                    call.resolve(ret);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    call.reject("Die Sperre wurde nicht eingeschaltet.");
                }
            });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("GlobeSIM sperren")
                .setSubtitle("Bestätige, dass du die Sperre einschalten willst")
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();
            prompt.authenticate(info);
        });
    }

    /**
     * eSIM-Installation per Knopfdruck: öffnet den Android-Installationsdialog für genau diese eSIM.
     * Die Adresse baut die App selbst aus dem LPA-Code; fremde Adressen werden nie geöffnet.
     */
    @PluginMethod
    public void openEsimInstall(PluginCall call) {
        String lpa = call.getString("lpa");
        if (lpa == null || !LPA_PATTERN.matcher(lpa).matches()) {
            call.reject("Ungültiger eSIM-Code.");
            return;
        }
        Uri uri = new Uri.Builder()
            .scheme("https")
            .authority("esimsetup.android.com")
            .appendPath("esim_qrcode_provisioning")
            .appendQueryParameter("carddata", lpa)
            .build();
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Dieses Gerät kann die eSIM nicht direkt installieren. Bitte den QR-Code scannen.");
        }
    }

    @PluginMethod
    public void setOffline(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (!enabled) {
            clearOffline();
            call.resolve();
            return;
        }
        String snapshot = call.getString("snapshot");
        if (snapshot == null || snapshot.length() > MAX_SNAPSHOT_CHARS || !writeSnapshot(snapshot)) {
            call.reject("Die eSIMs konnten nicht auf dem Gerät gespeichert werden.");
            return;
        }
        prefs(getContext()).edit().putBoolean(KEY_OFFLINE, true).apply();
        call.resolve();
    }

    @PluginMethod
    public void saveOffline(PluginCall call) {
        if (!prefs(getContext()).getBoolean(KEY_OFFLINE, false)) {
            call.resolve();
            return;
        }
        String snapshot = call.getString("snapshot");
        if (snapshot == null || snapshot.length() > MAX_SNAPSHOT_CHARS || !writeSnapshot(snapshot)) {
            call.reject("Speichern fehlgeschlagen.");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void loadOffline(PluginCall call) {
        JSObject ret = new JSObject();
        String value = null;
        if (prefs(getContext()).getBoolean(KEY_OFFLINE, false)) {
            SharedPreferences s = secure();
            if (s != null) value = s.getString(KEY_SNAPSHOT, null);
        }
        ret.put("snapshot", value);
        call.resolve(ret);
    }

    /** Beim Abmelden: Offline-Kopie löschen und Sperre ausschalten. */
    @PluginMethod
    public void clearAll(PluginCall call) {
        clearOffline();
        prefs(getContext()).edit().putBoolean(KEY_BIOMETRIC, false).apply();
        call.resolve();
    }

    private boolean writeSnapshot(String snapshot) {
        SharedPreferences s = secure();
        if (s == null) return false;
        boolean ok = s.edit().putString(KEY_SNAPSHOT, snapshot).commit();
        if (ok) prefs(getContext()).edit().putString(KEY_OFFLINE_SAVED_AT, isoNow()).apply();
        return ok;
    }

    private static String isoNow() {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US);
        f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return f.format(new java.util.Date());
    }

    private void clearOffline() {
        Context c = getContext();
        prefs(c).edit().putBoolean(KEY_OFFLINE, false).remove(KEY_OFFLINE_SAVED_AT).apply();
        deleteSecure(c);
    }
}
