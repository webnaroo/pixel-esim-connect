// Empfehlen & Verdienen: reine Regeln, ohne Datenbank. Die Tabellen stehen in drizzle/migrations/0037_referrals.sql.
export const REFERRAL_REWARD_CENTS = 200;
/** Erst ab diesem in bar bezahlten Betrag zählt der erste Kauf (gegen Mini-Bestellungen mit Fake-Konten). */
export const REFERRAL_MIN_ORDER_CENTS = 500;
/** Höchstens so viele belohnte Empfehlungen pro Werber (50 €). */
export const REFERRAL_MAX_REWARDS = 25;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I, O, 0, 1
export function generateReferralCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(random(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Großbuchstaben und Ziffern; alles andere fliegt raus. Null, wenn es nicht wie ein Code aussieht. */
export function normalizeReferralCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length >= 6 && c.length <= 12 ? c : null;
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/register?ref=${encodeURIComponent(code)}`;
}

/** Belohnung nur beim ersten bezahlten Kauf, in bar mindestens REFERRAL_MIN_ORDER_CENTS und solange das Limit nicht erreicht ist. */
export function rewardAllowed(o: { cashCents: number; alreadyRewarded: boolean; referrerRewardCount: number }): boolean {
  return !o.alreadyRewarded && o.cashCents >= REFERRAL_MIN_ORDER_CENTS && o.referrerRewardCount < REFERRAL_MAX_REWARDS;
}
