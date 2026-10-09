import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rule = z.object({ id: z.string().uuid(), scope: z.enum(["global", "country", "plan_type", "plan"]), scope_ref: z.string().trim().max(120).nullable(), type: z.enum(["percent", "fixed"]), value: z.number().min(-100).max(10000), rounding: z.enum(["49_99", "none"]), priority: z.number().int().min(-1000).max(1000) }).refine((r) => r.scope === "global" || Boolean(r.scope_ref), "Bezug fehlt");
export const priceChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recalculate") }),
  z.object({ kind: z.literal("create"), rule }),
  z.object({ kind: z.literal("update"), id: z.string().uuid(), rule }),
  z.object({ kind: z.literal("delete"), id: z.string().uuid() }),
  z.object({ kind: z.literal("settings"), settings: z.object({ stripe_fees: z.object({ percent: z.number().min(0).max(20), fixed: z.number().min(0).max(10) }), min_net_result: z.number().min(0).max(100) }) }),
  z.object({ kind: z.literal("override"), id: z.string().uuid(), override: z.number().positive().max(100000).nullable() }),
]);
export type PriceChangeInput = z.infer<typeof priceChangeSchema>;

export const previewPriceChange = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i) => priceChangeSchema.parse(i)).handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Error("Admin-Rolle erforderlich.");
    const { preparePriceChange } = await import("./price-recalculation.server");
    const prepared = await preparePriceChange(data);
    return { counts: prepared.counts, digest: prepared.digest };
  });
export const commitPriceChange = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ change: priceChangeSchema, digest: z.string().length(64) }).parse(i)).handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Error("Admin-Rolle erforderlich.");
    const { preparePriceChange, applyPreparedPrices } = await import("./price-recalculation.server");
    const prepared = await preparePriceChange(data.change);
    if (prepared.digest !== data.digest) throw new Error("Die Daten haben sich geändert. Bitte Vorschau erneut prüfen.");
    return applyPreparedPrices(prepared, context.userId);
  });