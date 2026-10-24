// GlobeMoney: Guthaben für jeden Kauf, höhere Stufe = höhere Gutschrift. Reine Regeln, ohne Datenbank.
// Rechnet überall in Cent (ganze Zahlen). Die Datenbank-Funktionen in drizzle/migrations/0033_globemoney.sql
// benutzen dieselben Status-Listen; ändere beide gemeinsam.
export const LOYALTY_NAME = "GlobeMoney";

export type LoyaltyTier = { id: "traveler" | "silver" | "gold" | "platinum"; label: string; fromCents: number; rate: number };

export const LOYALTY_TIERS: readonly LoyaltyTier[] = [
  { id: "traveler", label: "Reisender", fromCents: 0, rate: 0.05 },
  { id: "silver", label: "Silber-Reisender", fromCents: 1800, rate: 0.06 },
  { id: "gold", label: "Gold-Reisender", fromCents: 6000, rate: 0.07 },
  { id: "platinum", label: "Platin-Reisender", fromCents: 14000, rate: 0.1 },
];

/** Höchstens so viel einer Bestellung darf mit Guthaben bezahlt werden. */
export const MAX_REDEEM_SHARE = 0.5;
/** Stripe nimmt keine Zahlungen unter 0,50 €: so viel bleibt immer in bar zu zahlen. */
export const MIN_CASH_CENTS = 50;

/** Bestellungen, die Gutschrift und Stufe zählen lassen (bezahlt, nicht erstattet, nicht storniert). */
export const EARN_STATUSES = ["paid", "fulfilling", "fulfilled", "needs_review"] as const;
/** Bestellungen, bei denen eingesetztes Guthaben als ausgegeben gilt. Storniert, abgelaufen oder erstattet gibt es frei. */
export const RESERVE_STATUSES = ["pending", "paid", "fulfilling", "fulfilled", "needs_review", "fulfillment_failed", "payment_mismatch"] as const;
/** Offene Bestellungen halten ihr Guthaben höchstens so lange fest (danach läuft sie ohnehin ab). */
export const PENDING_HOLD_HOURS = 24;

export function tierForSpend(spendCents: number): LoyaltyTier {
  let tier = LOYALTY_TIERS[0]!;
  for (const t of LOYALTY_TIERS) if (spendCents >= t.fromCents) tier = t;
  return tier;
}

export function nextTier(spendCents: number): { tier: LoyaltyTier; remainingCents: number } | null {
  const t = LOYALTY_TIERS.find((x) => x.fromCents > spendCents);
  return t ? { tier: t, remainingCents: t.fromCents - spendCents } : null;
}

/** Gutschrift auf den in bar bezahlten Betrag; abgerundet auf ganze Cent. */
export function cashbackCents(cashCents: number, rate: number): number {
  if (!Number.isFinite(cashCents) || cashCents <= 0) return 0;
  return Math.floor(cashCents * rate);
}

/** Wie viel Guthaben bei einer Bestellung eingesetzt werden darf: Kontostand, Anteil und Mindestbetrag in bar. */
export function maxRedeemCents(grossCents: number, balanceCents: number): number {
  if (!(grossCents > 0) || !(balanceCents > 0)) return 0;
  const byShare = Math.floor(grossCents * MAX_REDEEM_SHARE);
  const byMinimum = grossCents - MIN_CASH_CENTS;
  return Math.max(0, Math.min(balanceCents, byShare, byMinimum));
}

export const toCents = (euro: number) => Math.round(euro * 100);
export const toEuro = (cents: number) => cents / 100;
