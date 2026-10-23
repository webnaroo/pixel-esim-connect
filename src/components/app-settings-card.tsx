// Einstellungen, die es nur in der Android-App gibt: Mitteilungen, Fingerabdruck-Sperre, eSIMs offline.
// Im normalen Browser rendert die Karte nichts.
import { useEffect, useState } from "react";
import { buildSnapshotJson, type AppAccountData as Data } from "@/lib/app-offline-sync";
import { Button } from "@/components/ui-kit";
import { registerPushDevice, unregisterPushDevice } from "@/lib/account.functions";
import { getAppState, getStoredPushToken, isAndroidApp, rememberPushToken, requestPushToken, setBiometricLock, setOfflineStorage, type AppState } from "@/lib/native-app";

function Row({ label, hint, on, busy, onToggle }: { label: string; hint: string; on: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="font-medium text-ink">{label}</div>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>
      <Button type="button" variant={on ? "secondary" : "primary"} loading={busy} onClick={onToggle} aria-pressed={on}>{on ? "Ausschalten" : "Einschalten"}</Button>
    </div>
  );
}

export function AppSettingsCard({ data }: { data: Data }) {
  const [app, setApp] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState<"push" | "bio" | "offline" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAndroidApp()) return;
    setApp(true);
    setPush(getStoredPushToken() !== null);
    getAppState().then(setState).catch(() => setState(null));
  }, []);
  if (!app) return null;

  const run = async (k: "push" | "bio" | "offline", fn: () => Promise<void>) => {
    setBusy(k); setMsg(null);
    try { await fn(); } catch (e) { setMsg(e instanceof Error && e.message !== "native_unavailable" ? e.message : "Das hat nicht geklappt. Bitte versuche es noch einmal."); }
    finally { setBusy(null); }
  };

  const togglePush = () => run("push", async () => {
    if (push) {
      const t = getStoredPushToken();
      if (t) await unregisterPushDevice({ data: { token: t } });
      rememberPushToken(null); setPush(false); return;
    }
    const token = await requestPushToken();
    if (!token) throw new Error("Mitteilungen sind nicht erlaubt. Du kannst das in den Android-Einstellungen unter Apps → GlobeSIM ändern.");
    await registerPushDevice({ data: { token, platform: "android" } });
    rememberPushToken(token); setPush(true);
  });

  const toggleBio = () => run("bio", async () => {
    if (!state) return;
    const enabled = await setBiometricLock(!state.biometricEnabled);
    setState({ ...state, biometricEnabled: enabled });
  });

  const toggleOffline = () => run("offline", async () => {
    if (!state) return;
    if (state.offlineEnabled) { await setOfflineStorage(false); setState({ ...state, offlineEnabled: false, offlineSavedAt: null }); return; }
    const json = await buildSnapshotJson(data);
    await setOfflineStorage(true, json);
    setState({ ...state, offlineEnabled: true, offlineSavedAt: new Date().toISOString() });
  });

  return (
    <section className="space-y-1 rounded-[14px] border border-line p-5" aria-labelledby="app-settings">
      <h2 id="app-settings" className="text-xl">App</h2>
      <div className="divide-y divide-line">
        {state?.pushAvailable ? (
          <Row label="Mitteilungen" hint="Bescheid, wenn deine eSIM bereit ist und wenn 80 % deines Datenvolumens verbraucht sind." on={push} busy={busy === "push"} onToggle={togglePush} />
        ) : null}
        {state?.biometricAvailable ? (
          <Row label="Fingerabdruck-Sperre" hint="Die App öffnet sich nur nach Fingerabdruck, Gesicht oder Geräte-PIN." on={state.biometricEnabled} busy={busy === "bio"} onToggle={toggleBio} />
        ) : null}
        {state ? (
          <Row label="eSIMs offline speichern" hint={state.offlineEnabled ? `Gespeichert auf diesem Gerät${state.offlineSavedAt ? ` (${new Date(state.offlineSavedAt).toLocaleDateString("de-DE")})` : ""}. Ohne Internet siehst du QR-Code und Installationsdaten in der App. Beim Abmelden wird alles gelöscht.` : "Speichert QR-Code und Installationsdaten verschlüsselt auf diesem Gerät, damit du sie auch ohne Internet siehst, zum Beispiel im Flugzeug."} on={state.offlineEnabled} busy={busy === "offline"} onToggle={toggleOffline} />
        ) : null}
      </div>
      {msg ? <p role="alert" className="pt-2 text-sm text-ink-muted">{msg}</p> : null}
    </section>
  );
}
