import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageLight, validateManual } from "./fx";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function assertAdmin(ctx: unknown) {
  const c = ctx as Ctx;
  const { data } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export const getFxAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { loadFx } = await import("./fx.server");
    const fx = await loadFx(db);
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: history }, { data: cur }] = await Promise.all([
      db.from("fx_rates").select("id,from_currency,rate,source,status,published_at,fetched_at,last_checked_at,expires_at,reason").gte("fetched_at", since).order("fetched_at", { ascending: false }).limit(200),
      db.from("plans").select("cost_currency").eq("provider", "esimerge"),
    ]);
    const currencies = [...new Set(["USD", ...(cur ?? []).map((c) => c.cost_currency.toUpperCase())])].filter((c) => c !== "EUR");
    return {
      buffer: fx.buffer,
      current: currencies.map((c) => {
        const e = fx.effective(c);
        return { currency: c, effective: e ? { ...e, light: ageLight(e.ageDays) } : null };
      }),
      pending: (history ?? []).filter((h) => h.status === "pending_review").map((h) => ({ ...h, rate: Number(h.rate) })),
      history: (history ?? []).map((h) => ({ ...h, rate: Number(h.rate) })),
    };
  });
export const fxAdminQuery = () => queryOptions({ queryKey: ["admin", "fx"], queryFn: () => getFxAdmin() });

export const refreshFxNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { refreshRates } = await import("./fx.server");
    return refreshRates("manual", (context as unknown as Ctx).userId);
  });

export const decideFxReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const uid = (context as unknown as Ctx).userId;
    const db = await admin();
    const { data: row } = await db.from("fx_rates").update({ status: data.accept ? "active" : "rejected", decided_by: uid }).eq("id", data.id).eq("status", "pending_review").select("id,from_currency,rate").maybeSingle();
    if (!row) return { ok: false as const };
    await db.from("audit_log").insert({ actor_id: uid, action: data.accept ? "fx_review_accepted" : "fx_review_rejected", entity: "fx_rates", entity_id: row.id, meta: { currency: row.from_currency, rate: row.rate } as never });
    if (data.accept) await (await import("./fx.server")).repricePlans(uid);
    return { ok: true as const };
  });

export const setManualFx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ from: z.string().regex(/^[A-Z]{3}$/), rate: z.number().positive().max(100000), reason: z.string().trim().max(500), expiresAt: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const err = validateManual(data, new Date());
    if (err) return { ok: false as const, error: err };
    const uid = (context as unknown as Ctx).userId;
    const db = await admin();
    const { data: row } = await db.from("fx_rates").insert({ from_currency: data.from, to_currency: "EUR", rate: data.rate, source: "manual", status: "active", reason: data.reason, expires_at: new Date(data.expiresAt).toISOString(), decided_by: uid, valid_from: new Date().toISOString() }).select("id").single();
    await db.from("audit_log").insert({ actor_id: uid, action: "fx_manual_set", entity: "fx_rates", entity_id: row?.id ?? null, meta: { currency: data.from, rate: data.rate, reason: data.reason, expires_at: data.expiresAt } as never });
    await (await import("./fx.server")).repricePlans(uid);
    return { ok: true as const };
  });

