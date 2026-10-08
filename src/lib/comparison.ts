// Pure comparison rules (no I/O). Server code and tests call these.
export type CellStatus = "check" | "neutral" | "cross";
export type Requires = "unlimited_plans" | "unlimited_no_throttle" | "support_hours" | "destination_count" | null;

export type Competitor = { id: string; name: string; slug: string; logo_url: string | null; website_url?: string | null; enabled: boolean; sort_order: number };
export type ComparisonRowRec = { id: string; sort_order: number; question: string; globesim_text: string; globesim_status: "check" | "neutral"; requires: Requires; enabled: boolean };
export type FactRec = { id: string; row_id: string; competitor_id: string; text: string; status: CellStatus; source_url: string | null; checked_at: string | null; enabled: boolean };
export type GlobeSimContext = { hasUnlimitedPlans: boolean; hasNoThrottlePlans?: boolean; supportHours: string | null; destinationCount: number };

export const FACT_MAX_AGE_DAYS = 90;
export const FACT_WARN_AGE_DAYS = 60;
const DAY = 86_400_000;

export function factAgeDays(checkedAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(checkedAt).getTime()) / DAY);
}

export function isFactValid(f: FactRec, now: Date): boolean {
  if (!f.enabled || !f.source_url || !f.checked_at) return false;
  if (!/^https:\/\/[^\s]+$/i.test(f.source_url)) return false;
  const age = factAgeDays(f.checked_at, now);
  return age >= 0 ? age <= FACT_MAX_AGE_DAYS : age > -2; // tolerate timezone skew only
}

export type FactLight = "green" | "yellow" | "red";
export function factLight(checkedAt: string, now: Date): FactLight {
  const age = factAgeDays(checkedAt, now);
  return age < FACT_WARN_AGE_DAYS ? "green" : age <= FACT_MAX_AGE_DAYS ? "yellow" : "red";
}

/** GlobeSIM statement, or null when its condition is not met. */
export function globeSimText(row: ComparisonRowRec, ctx: GlobeSimContext): string | null {
  const text = row.globesim_text.trim();
  if (!text) return null;
  switch (row.requires) {
    case "unlimited_plans": return ctx.hasUnlimitedPlans ? text : null;
    case "unlimited_no_throttle": return ctx.hasNoThrottlePlans ? text : null;
    case "support_hours": return ctx.supportHours ? text.replaceAll("{hours}", ctx.supportHours) : null;
    case "destination_count": return ctx.destinationCount > 0 ? text.replaceAll("{count}", String(ctx.destinationCount)) : null;
    default: return text;
  }
}

export type ViewCell = { text: string; status: CellStatus; sourceUrl: string; checkedAt: string };
export type ViewRow = { id: string; question: string; globesim: { text: string; status: "check" | "neutral" }; other: ViewCell };
export type ViewCompetitor = { id: string; name: string; slug: string; logoUrl: string | null; rows: ViewRow[] };
export type ComparisonView = { competitors: ViewCompetitor[]; latestCheckedAt: string };

export function buildComparison(input: { competitors: Competitor[]; rows: ComparisonRowRec[]; facts: FactRec[]; ctx: GlobeSimContext; now: Date }): ComparisonView | null {
  const { now, ctx } = input;
  const rows = input.rows.filter((r) => r.enabled).sort((a, b) => a.sort_order - b.sort_order);
  const facts = input.facts.filter((f) => isFactValid(f, now));
  let latest = "";
  const competitors: ViewCompetitor[] = [];
  for (const c of [...input.competitors].filter((c) => c.enabled).sort((a, b) => a.sort_order - b.sort_order)) {
    const out: ViewRow[] = [];
    for (const r of rows) {
      const g = globeSimText(r, ctx);
      const f = facts.find((x) => x.row_id === r.id && x.competitor_id === c.id);
      if (!g || !f) continue;
      out.push({ id: r.id, question: r.question, globesim: { text: g, status: r.globesim_status }, other: { text: f.text, status: f.status, sourceUrl: f.source_url!, checkedAt: f.checked_at! } });
      if (f.checked_at! > latest) latest = f.checked_at!;
    }
    if (out.length) competitors.push({ id: c.id, name: c.name, slug: c.slug, logoUrl: c.logo_url, rows: out });
  }
  return competitors.length ? { competitors, latestCheckedAt: latest } : null;
}
