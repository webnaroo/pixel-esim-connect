// Offline-Kopie der eSIMs für die Android-App (Installationsdaten + fertiger QR-Code als SVG).
// Reine Regeln, ohne Netzwerk. Gespeichert wird nur auf dem Gerät (verschlüsselt, siehe mobile/).
export type OfflineEsim = {
  orderId: string;
  title: string;
  lpa: string;
  smdp: string | null;
  activationCode: string | null;
  validityDays: number | null;
  activatedAt: string | null;
  qrSvg: string;
};

export type OfflineSnapshot = { v: 1; savedAt: string; esims: OfflineEsim[] };

export const OFFLINE_MAX_ESIMS = 20;

/** Nur nutzbare eSIMs: Installationsdaten vorhanden und nicht abgelaufen, storniert oder erstattet. */
export function isOfflineEligible(e: { status: string }, orderStatus: string | undefined): boolean {
  if (orderStatus !== "fulfilled") return false;
  return e.status === "ready" || e.status === "active";
}

export function buildOfflineSnapshot(items: OfflineEsim[], now: Date): OfflineSnapshot {
  const esims = items.filter((i) => i.lpa && i.qrSvg).slice(0, OFFLINE_MAX_ESIMS);
  return { v: 1, savedAt: now.toISOString(), esims };
}

export function parseOfflineSnapshot(raw: string | null | undefined): OfflineSnapshot | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<OfflineSnapshot>;
    if (j.v !== 1 || !Array.isArray(j.esims) || typeof j.savedAt !== "string") return null;
    return { v: 1, savedAt: j.savedAt, esims: j.esims as OfflineEsim[] };
  } catch {
    return null;
  }
}
