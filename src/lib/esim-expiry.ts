// Ablauf des Tarifs und Zeitpunkt der Ablauf-Mitteilung. Reine Regeln.
// Der Tarif läuft ab Aktivierung (activated_at) für validity_days Tage. esims.expires_at ist etwas anderes
// (Installationsfenster des Profils) und wird hier nie benutzt.
export const EXPIRY_ALERT_HOURS = 48;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export function planEndsAt(activatedAt: string | null | undefined, validityDays: number | null | undefined): Date | null {
  if (!activatedAt || !validityDays || validityDays <= 0) return null;
  const start = new Date(activatedAt).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start + validityDays * DAY_MS);
}

/** Fällig: noch nicht gesendet, Ende in der Zukunft und höchstens 48 Stunden entfernt. */
export function expiryAlertDue(o: { activatedAt: string | null | undefined; validityDays: number | null | undefined; alreadySent: boolean; now: Date }): { due: boolean; daysLeft: number } {
  const end = planEndsAt(o.activatedAt, o.validityDays);
  if (!end || o.alreadySent) return { due: false, daysLeft: 0 };
  const ms = end.getTime() - o.now.getTime();
  if (ms <= 0 || ms > EXPIRY_ALERT_HOURS * HOUR_MS) return { due: false, daysLeft: 0 };
  return { due: true, daysLeft: Math.max(1, Math.ceil(ms / DAY_MS)) };
}
