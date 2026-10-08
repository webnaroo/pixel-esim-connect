// Pure rules for the "ohne Drosselung" (no throttling) claim on Unlimited plans. No I/O.
export type ThrottleClaim = "unknown" | "none_confirmed" | "conflict";
export type FairUse = { throttleAfterMb?: number; throttledSpeedKbps?: number; note?: string } | null;
export type ThrottleConfirmation = {
  source: string;
  date: string; // YYYY-MM-DD
  confirmedBy?: string;
  /** Provider hint the admin explicitly reviewed and accepted despite the contradiction. */
  acceptedFairUse?: FairUse;
};
export type ClaimTexts = { label: string; qualifier: string; note: string };

const HINT = /drossel|throttl|reduz|reduced|slow|kbps|kbit|mbps|mbit|high[- ]?speed|danach|after|fair[- ]?us/i;

/** True when the provider catalog signals any throttling / fair-use limit. */
export function hasThrottleHint(f: FairUse | undefined): boolean {
  if (!f) return false;
  if (f.throttleAfterMb || f.throttledSpeedKbps) return true;
  return !!f.note && HINT.test(f.note);
}

const same = (a: FairUse | undefined, b: FairUse | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Claim after a catalog sync: a new/changed provider hint never silently keeps "ohne Drosselung". */
export function claimAfterSync(current: ThrottleClaim, conf: ThrottleConfirmation | null, fairUse: FairUse): ThrottleClaim {
  if (current !== "none_confirmed") return current;
  if (hasThrottleHint(fairUse) && !same(fairUse, conf?.acceptedFairUse)) return "conflict";
  return current;
}

export function validateConfirmation(source: string, date: string, today: Date): string | null {
  if (source.trim().length < 3) return "Quelle ist Pflicht (Link oder Text).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return "Datum ist Pflicht.";
  if (date > today.toISOString().slice(0, 10)) return "Datum darf nicht in der Zukunft liegen.";
  return null;
}

/** Admin bulk confirmation. A plan whose catalog contradicts it lands in "conflict" unless the admin explicitly accepts the hint. */
export function confirmClaim(fairUse: FairUse, input: { source: string; date: string; confirmedBy: string; acceptHint: boolean }): { claim: ThrottleClaim; confirmation: ThrottleConfirmation } {
  const hint = hasThrottleHint(fairUse);
  const confirmation: ThrottleConfirmation = { source: input.source.trim(), date: input.date, confirmedBy: input.confirmedBy, ...(hint && input.acceptHint ? { acceptedFairUse: fairUse } : {}) };
  return { claim: hint && !input.acceptHint ? "conflict" : "none_confirmed", confirmation };
}

export function showsNoThrottle(p: { type: string; throttleClaim?: ThrottleClaim | null }): boolean {
  return p.type === "unlimited" && p.throttleClaim === "none_confirmed";
}

export function parseClaimTexts(v: unknown): ClaimTexts | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
  const t = { label: s("label"), qualifier: s("qualifier"), note: s("note") };
  return t.label ? t : null;
}

/** Plain-text plan label for emails (same rule as the UI). */
export function unlimitedLabelText(throttleClaim: ThrottleClaim | null | undefined, texts: ClaimTexts | null): string {
  if (!texts || !showsNoThrottle({ type: "unlimited", throttleClaim })) return "Unlimited";
  return `Unlimited · ${texts.label}${texts.qualifier ? ` (${texts.qualifier})` : ""}${texts.note ? `\n${texts.note}` : ""}`;
}
