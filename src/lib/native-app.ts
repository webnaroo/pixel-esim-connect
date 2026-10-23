// Brücke zur Android-App (mobile/). Die Seite läuft als normale Webseite weiter; diese Funktionen tun
// ausschließlich etwas, wenn die Seite in der App geöffnet ist. Im Browser sind sie ohne Wirkung.
// Es wird bewusst kein Capacitor-Paket importiert: die App stellt `window.Capacitor` selbst bereit.
import { isSafeAppPath, isValidPushToken } from "./push";

type CapListener = { remove: () => void | Promise<void> };
type Cap = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  nativePromise?: (plugin: string, method: string, options?: unknown) => Promise<unknown>;
  addListener?: (plugin: string, event: string, cb: (data: unknown) => void) => CapListener | Promise<CapListener>;
  Plugins?: Record<string, Record<string, (o?: unknown) => Promise<unknown>> | undefined>;
};

const APP_PLUGIN = "GlobeSimApp";
const PUSH_TOKEN_KEY = "globesim.push.token";

function cap(): Cap | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { Capacitor?: Cap }).Capacitor ?? null);
}

/** Nur die Android-App; iPhone bekommt diese Funktionen erst, wenn sie dort gebaut sind. */
export function isAndroidApp(): boolean {
  const c = cap();
  try { return Boolean(c?.isNativePlatform?.()) && c?.getPlatform?.() === "android"; } catch { return false; }
}

async function call<T>(plugin: string, method: string, options: unknown = {}): Promise<T> {
  const c = cap();
  if (c?.nativePromise) return (await c.nativePromise(plugin, method, options)) as T;
  const fn = c?.Plugins?.[plugin]?.[method];
  if (fn) return (await fn(options)) as T;
  throw new Error("native_unavailable");
}

async function listen(plugin: string, event: string, cb: (data: unknown) => void): Promise<CapListener | null> {
  const c = cap();
  if (c?.addListener) return await c.addListener(plugin, event, cb);
  const p = c?.Plugins?.[plugin] as { addListener?: (e: string, cb: (d: unknown) => void) => Promise<CapListener> } | undefined;
  return p?.addListener ? await p.addListener(event, cb) : null;
}

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

// ---- Gerätezustand (Fingerabdruck-Sperre, Offline-Kopie) ----
export type AppState = { pushAvailable: boolean; biometricAvailable: boolean; biometricEnabled: boolean; offlineEnabled: boolean; offlineSavedAt: string | null };

export async function getAppState(): Promise<AppState> {
  return call<AppState>(APP_PLUGIN, "getState");
}

export async function setBiometricLock(enabled: boolean): Promise<boolean> {
  const r = await call<{ enabled: boolean }>(APP_PLUGIN, "setBiometricEnabled", { enabled });
  return r.enabled;
}

export async function setOfflineStorage(enabled: boolean, snapshotJson?: string): Promise<void> {
  await call(APP_PLUGIN, "setOffline", { enabled, snapshot: snapshotJson ?? null });
}

export async function saveOfflineSnapshot(snapshotJson: string): Promise<void> {
  await call(APP_PLUGIN, "saveOffline", { snapshot: snapshotJson });
}

// ---- Push-Mitteilungen ----
export function getStoredPushToken(): string | null {
  const t = storage()?.getItem(PUSH_TOKEN_KEY) ?? null;
  return isValidPushToken(t) ? t : null;
}

/** Fragt die Erlaubnis ab, holt das Geräte-Token und gibt es zurück (null = abgelehnt). */
export async function requestPushToken(): Promise<string | null> {
  const perm = await call<{ receive: string }>("PushNotifications", "requestPermissions");
  if (perm.receive !== "granted") return null;
  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (t: string | null) => { if (!done) { done = true; resolve(t); } };
    const timer = setTimeout(() => finish(null), 15_000);
    void listen("PushNotifications", "registration", (d) => {
      clearTimeout(timer);
      const v = (d as { value?: unknown } | null)?.value;
      finish(isValidPushToken(v) ? v : null);
    }).then(() => call("PushNotifications", "register")).catch(() => finish(null));
  });
}

export function rememberPushToken(token: string | null) {
  const s = storage();
  if (!s) return;
  try { if (token) s.setItem(PUSH_TOKEN_KEY, token); else s.removeItem(PUSH_TOKEN_KEY); } catch { /* ignorieren */ }
}

/** Tippen auf eine Mitteilung: öffnet die in der Mitteilung genannte Seite, aber nur auf der eigenen Domain. */
export async function onNotificationOpened(open: (path: string) => void): Promise<void> {
  if (!isAndroidApp()) return;
  try {
    await listen("PushNotifications", "pushNotificationActionPerformed", (d) => {
      const path = (d as { notification?: { data?: { path?: unknown } } } | null)?.notification?.data?.path;
      if (isSafeAppPath(path)) open(path);
    });
  } catch { /* Mitteilungen sind optional */ }
}

/** Beim Abmelden: Gerät beim Server abmelden und alles lokal löschen (Offline-Daten, Sperre, Token). */
export async function clearNativeAppData(unregister: (token: string) => Promise<unknown>): Promise<void> {
  if (!isAndroidApp()) return;
  const token = getStoredPushToken();
  try { if (token) await unregister(token); } catch { /* Server nicht erreichbar: Token wird beim nächsten Fehlversand entfernt */ }
  rememberPushToken(null);
  try { await call(APP_PLUGIN, "clearAll"); } catch { /* ignorieren */ }
}
