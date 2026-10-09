// Pure exchange-rate rules. No I/O. Rates are stored as "1 FROM = rate TO" (e.g. USD→EUR).
export const FX_MAX_DEVIATION = 0.05; // > 5 % jump → admin review
export const FX_WARN_DAYS = 4;
export const FX_MAX_DAYS = 7; // older → no rate, no price
export const MANUAL_MAX_DAYS = 7;
export const PRICE_CHANGE_MIN = 0.005; // reprice only if gross moves > 0.5 %
export const DEFAULT_BUFFER_PERCENT = 3.5;

export type FxSource = "ecb" | "fallback" | "manual";
export type FxRow = {
  from_currency: string;
  to_currency: string;
  rate: number; // source rate (without buffer)
  source: FxSource | string;
  status: "active" | "pending_review" | "rejected" | string;
  published_at: string | null; // YYYY-MM-DD from the source
  fetched_at: string;
  expires_at: string | null;
};
export type QuoteSet = { date: string; eurTo: Record<string, number> };
export type Effective = { from: string; sourceRate: number; usedRate: number; bufferPercent: number; source: string; publishedAt: string | null; ageDays: number; manual: boolean };

/** ECB publishes EUR→X; we need X→EUR. */
export const invertEurRate = (eurToX: number) => 1 / eurToX;

export function parseEcbXml(xml: string): QuoteSet | null {
  const date = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  if (!date) return null;
  const eurTo: Record<string, number> = {};
  for (const m of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    const v = Number(m[2]);
    if (m[1] && v > 0) eurTo[m[1]] = v;
  }
  return Object.keys(eurTo).length ? { date, eurTo } : null;
}

export function parseFrankfurter(json: unknown): QuoteSet | null {
  const o = json as { base?: string; date?: string; rates?: Record<string, number> } | null;
  if (!o || o.base !== "EUR" || !o.date || !o.rates) return null;
  const eurTo: Record<string, number> = {};
  for (const [k, v] of Object.entries(o.rates)) if (/^[A-Z]{3}$/.test(k) && typeof v === "number" && v > 0) eurTo[k] = v;
  return Object.keys(eurTo).length ? { date: o.date, eurTo } : null;
}

const DAY = 86_400_000;
export const ageInDays = (publishedAt: string | null, fetchedAt: string, now: Date) =>
  (now.getTime() - new Date(publishedAt ? `${publishedAt}T16:00:00Z` : fetchedAt).getTime()) / DAY;

export function ageLight(days: number): "green" | "yellow" | "red" {
  return days < 2 ? "green" : days <= FX_WARN_DAYS ? "yellow" : "red";
}

const newest = (rows: FxRow[]) => [...rows].sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0];

/** Last accepted automatic rate (used as reference for the plausibility check). */
export function lastAutoRate(rows: FxRow[], from: string): FxRow | undefined {
  return newest(rows.filter((r) => r.from_currency === from && r.to_currency === "EUR" && r.status === "active" && r.source !== "manual"));
}

/** Rate used for prices: a valid manual override wins, else the newest accepted automatic rate if not older than 7 days. */
export function effectiveRate(rows: FxRow[], from: string, now: Date, bufferPercent: number): Effective | null {
  const mine = rows.filter((r) => r.from_currency === from && r.to_currency === "EUR" && r.status === "active");
  const manual = newest(mine.filter((r) => r.source === "manual" && r.expires_at && new Date(r.expires_at) > now));
  const pick = manual ?? newest(mine.filter((r) => r.source !== "manual"));
  if (!pick || !(pick.rate > 0)) return null;
  const ageDays = ageInDays(manual ? null : pick.published_at, pick.fetched_at, now);
  if (!manual && ageDays > FX_MAX_DAYS) return null;
  const buffer = Number.isFinite(bufferPercent) && bufferPercent >= 0 ? bufferPercent : DEFAULT_BUFFER_PERCENT;
  return { from, sourceRate: pick.rate, usedRate: pick.rate * (1 + buffer / 100), bufferPercent: buffer, source: pick.source, publishedAt: pick.published_at, ageDays, manual: !!manual };
}

/** New automatic rate: accept, or hold for admin review when it jumps more than 5 %. */
export function decideNewRate(last: FxRow | undefined, candidate: number): "accept" | "review" {
  if (!last) return "accept";
  return Math.abs(candidate - last.rate) / last.rate > FX_MAX_DEVIATION ? "review" : "accept";
}

export function shouldReprice(oldGross: number, newGross: number): boolean {
  if (!(oldGross > 0)) return true;
  return Math.round(newGross * 100) !== Math.round(oldGross * 100);
}

export function validateManual(input: { rate: number; reason: string; expiresAt: string }, now: Date): string | null {
  if (!(input.rate > 0)) return "Kurs muss größer 0 sein.";
  if (input.reason.trim().length < 5) return "Begründung ist Pflicht.";
  const exp = new Date(input.expiresAt);
  if (Number.isNaN(exp.getTime()) || exp <= now) return "Ablaufdatum muss in der Zukunft liegen.";
  if (exp.getTime() - now.getTime() > MANUAL_MAX_DAYS * DAY + 60_000) return "Ablaufdatum höchstens 7 Tage.";
  return null;
}

/** Fetch outcome: primary, else fallback, else keep the last rate and warn. */
export async function fetchQuotes(primary: () => Promise<QuoteSet | null>, fallback: () => Promise<QuoteSet | null>): Promise<{ quotes: QuoteSet; source: "ecb" | "fallback" } | { quotes: null; warning: string }> {
  const tryIt = async (f: () => Promise<QuoteSet | null>) => { try { return await f(); } catch { return null; } };
  const a = await tryIt(primary);
  if (a) return { quotes: a, source: "ecb" };
  const b = await tryIt(fallback);
  if (b) return { quotes: b, source: "fallback" };
  return { quotes: null, warning: "EZB und Ausweichquelle nicht erreichbar. Der letzte gültige Kurs bleibt bestehen." };
}
