// Offline-Kopie der eSIMs für die Android-App: Daten holen, QR-Codes bauen, auf dem Gerät speichern.
import { useEffect } from "react";
import { getMyInstallData, type getMyAccount } from "@/lib/account.functions";
import { buildOfflineSnapshot, isOfflineEligible, type OfflineEsim } from "@/lib/offline-esims";
import { getAppState, isAndroidApp, saveOfflineSnapshot } from "@/lib/native-app";

export type AppAccountData = Awaited<ReturnType<typeof getMyAccount>>;
type Data = AppAccountData;

function title(p: Data["orders"][number]["plan"]) {
  const gb = p.data_mb ? (p.data_mb >= 1024 ? `${Math.round(p.data_mb / 102.4) / 10} GB` : `${p.data_mb} MB`) : null;
  return [p.destination, p.type === "unlimited" ? "Unlimited" : gb, p.validity_days ? `${p.validity_days} Tage` : null].filter(Boolean).join(" · ");
}

/** Baut die Offline-Kopie aus den eigenen eSIMs. Installationsdaten kommen nur über die geprüfte Besitzer-Abfrage. */
export async function buildSnapshotJson(data: Data): Promise<string> {
  const orderStatus = new Map(data.orders.map((o) => [o.id, o.status]));
  const QR = await import("qrcode");
  const items: OfflineEsim[] = [];
  for (const e of data.esims) {
    if (!isOfflineEligible(e, orderStatus.get(e.orderId))) continue;
    const inst = await getMyInstallData({ data: { orderId: e.orderId } });
    if (!inst?.lpa) continue;
    items.push({
      orderId: e.orderId,
      title: title(e.plan),
      lpa: inst.lpa,
      smdp: inst.smdp,
      activationCode: inst.activationCode,
      validityDays: e.plan.validity_days ?? null,
      activatedAt: e.activatedAt,
      qrSvg: await QR.toString(inst.lpa, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
    });
  }
  return JSON.stringify(buildOfflineSnapshot(items, new Date()));
}

/** Hält die Offline-Kopie aktuell, solange sie eingeschaltet ist. Läuft beim Öffnen des Kontos. */
export function useOfflineAutoSync(data: Data | undefined) {
  useEffect(() => {
    if (!data || !isAndroidApp()) return;
    let alive = true;
    (async () => {
      try {
        const st = await getAppState();
        if (!alive || !st.offlineEnabled) return;
        await saveOfflineSnapshot(await buildSnapshotJson(data));
      } catch { /* offline oder keine App-Funktion: Kopie bleibt wie sie ist */ }
    })();
    return () => { alive = false; };
  }, [data]);
}
