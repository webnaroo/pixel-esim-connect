// Push-Mitteilungen der App: Texte und Prüfregeln. Reine Funktionen, ohne Netzwerk.
// Texte nennen nie Aktivierungscode, LPA oder QR; sie führen nur auf die Kontoseite.
export type PushKind = "esim_ready" | "usage_alert" | "esim_expiring";

export type PushMessage = { title: string; body: string; path: string };

export function buildPushMessage(kind: PushKind, o: { plan?: string | null | undefined; threshold?: number | null | undefined; daysLeft?: number | null | undefined } = {}): PushMessage | null {
  if (kind === "esim_ready") {
    return { title: "Deine eSIM ist bereit", body: o.plan ? `${o.plan}: Jetzt in der App installieren.` : "Jetzt in der App installieren.", path: "/account" };
  }
  if (kind === "esim_expiring") {
    const d = o.daysLeft ?? 0;
    if (d < 1) return null;
    return { title: d === 1 ? "Deine eSIM läuft morgen ab" : `Deine eSIM läuft in ${d} Tagen ab`, body: o.plan ? `Tarif ${o.plan}: Nutze dein Datenvolumen rechtzeitig.` : "Nutze dein Datenvolumen rechtzeitig.", path: "/account" };
  }
  if (kind === "usage_alert") {
    const t = o.threshold ?? 0;
    if (t >= 100) return { title: "Datenvolumen aufgebraucht", body: o.plan ? `Dein Volumen für ${o.plan} ist verbraucht.` : "Dein Datenvolumen ist verbraucht.", path: "/account" };
    if (t >= 80) return { title: "80 % deines Datenvolumens verbraucht", body: o.plan ? `Für ${o.plan} bleiben noch etwa 20 %.` : "Es bleiben noch etwa 20 %.", path: "/account" };
  }
  return null;
}

/** Nur relative Pfade auf der eigenen Seite; verhindert, dass eine Mitteilung auf fremde Adressen führt. */
export function isSafeAppPath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") && p.length <= 200;
}

export function isValidPushToken(t: unknown): t is string {
  return typeof t === "string" && t.length >= 20 && t.length <= 4096 && !/\s/.test(t);
}
