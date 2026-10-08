import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { publicDb } from "./public-db.server";
import { buildComparison, type ComparisonView, type ComparisonRowRec, type FactRec, type Competitor } from "./comparison";
import { USE_FIXTURES } from "./format";

export type ComparisonPayload = { view: ComparisonView | null; fixture: boolean };

export const getComparison = createServerFn({ method: "GET" }).handler(async (): Promise<ComparisonPayload> => {
  const db = publicDb();
  const now = new Date();
  const [c, r, f, unl, dest, sh, nothr] = await Promise.all([
    db.from("competitors").select("id,name,slug,logo_url,enabled,sort_order"),
    db.from("comparison_rows").select("id,sort_order,question,globesim_text,globesim_status,requires,enabled"),
    db.from("comparison_facts").select("id,row_id,competitor_id,text,status,source_url,checked_at,enabled"),
    db.from("public_plans").select("id", { count: "exact", head: true }).eq("type", "unlimited"),
    db.from("public_plans").select("destination_id"),
    db.from("app_settings").select("value").eq("key", "support_hours").maybeSingle(),
    db.from("public_plans").select("id", { count: "exact", head: true }).eq("type", "unlimited").eq("throttle_claim", "none_confirmed"),
  ]);
  const hours = typeof sh.data?.value === "string" && sh.data.value.trim() ? sh.data.value.trim() : null;
  const ctx = { hasUnlimitedPlans: (unl.count ?? 0) > 0, hasNoThrottlePlans: (nothr.count ?? 0) > 0, supportHours: hours, destinationCount: new Set((dest.data ?? []).map((p) => p.destination_id)).size };
  const view = buildComparison({
    competitors: (c.data ?? []) as Competitor[],
    rows: (r.data ?? []) as ComparisonRowRec[],
    facts: (f.data ?? []) as FactRec[],
    ctx,
    now,
  });
  if (view || !USE_FIXTURES) return { view, fixture: false };
  // Preview-only sample (VITE_USE_FIXTURES=true), always labelled "Testdaten". Never real competitor claims.
  const { comparisonFixture } = await import("./fixtures/comparison");
  return { view: buildComparison({ ...comparisonFixture(now), ctx: { hasUnlimitedPlans: true, supportHours: "Testdaten", destinationCount: 1 }, now }), fixture: true };
});

export const comparisonQuery = () => queryOptions({ queryKey: ["comparison"], queryFn: () => getComparison(), staleTime: 5 * 60_000 });
