import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adjustInputSchema, deductionAllowed, exactIlikePattern, findInputSchema } from "./loyalty-admin";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}

/** Konto zu einer E-Mail-Adresse (genau eines, Groß- und Kleinschreibung egal). */
async function findCustomer(email: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data } = await db.from("profiles").select("id,email,name").ilike("email", exactIlikePattern(email)).limit(2);
  if (!data?.length) throw new Error("Kein Konto mit dieser E-Mail-Adresse gefunden.");
  if (data.length > 1) throw new Error("Mehrere Konten passen zu dieser E-Mail-Adresse. Bitte im Support klären.");
  return data[0]!;
}

async function customerView(userId: string, email: string | null, name: string | null) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { loyaltySummary } = await import("./loyalty.server");
  const [summary, { data: history }] = await Promise.all([
    loyaltySummary(userId),
    db.from("loyalty_adjustments").select("id,amount,reason,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    email,
    name,
    balanceCents: summary.balanceCents,
    tier: summary.tier.label,
    history: (history ?? []).map((h) => ({ id: h.id, amount: Number(h.amount), reason: h.reason, createdAt: h.created_at })),
  };
}

/** Admin: Kunden per E-Mail suchen und GlobeMoney-Stand mit den letzten Buchungen zeigen. */
export const findLoyaltyCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => findInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const c = await findCustomer(data.email);
    return customerView(c.id, c.email, c.name);
  });

/** Admin: GlobeMoney gutschreiben (positiv) oder abziehen (negativ). Mit Grund, protokolliert im Audit-Log. */
export const adjustLoyaltyCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => adjustInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const c = await findCustomer(data.email);
    const { loyaltySummary } = await import("./loyalty.server");
    const before = await loyaltySummary(c.id);
    if (!deductionAllowed(before.balanceCents, data.amount)) throw new Error("Abziehen ist höchstens bis zum aktuellen Guthaben möglich.");
    const amount = Math.round(data.amount * 100) / 100;
    const { data: row, error } = await db.from("loyalty_adjustments").insert({ user_id: c.id, amount, reason: data.reason, created_by: context.userId, counts_for_tier: amount > 0 && data.countsForTier }).select("id").single();
    if (error || !row) throw new Error("Die Buchung konnte nicht gespeichert werden.");
    await db.from("audit_log").insert({ actor_id: context.userId, action: "loyalty_adjusted", entity: "loyalty_adjustment", entity_id: row.id, meta: { user_id: c.id, amount, reason: data.reason, counts_for_tier: amount > 0 && data.countsForTier } });
    return customerView(c.id, c.email, c.name);
  });
