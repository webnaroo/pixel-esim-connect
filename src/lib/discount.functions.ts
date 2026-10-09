import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { discountCreateSchema, isCodeFormatValid, normalizeCode } from "./discount-rules";

export const discountCodesQuery = () =>
  queryOptions({ queryKey: ["admin-discount-codes"], queryFn: () => getDiscountCodes() });

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}

export type AdminDiscountCode = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  max_uses: number | null;
  times_used: number;
  valid_until: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
};

export const getDiscountCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ codes: AdminDiscountCode[] }> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("discount_codes")
      .select("id,code,type,value,max_uses,times_used,valid_until,active,note,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { codes: (data ?? []) as AdminDiscountCode[] };
  });

export const createDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => discountCreateSchema.parse(i))
  .handler(async ({ data, context }): Promise<{ ok: true; code: string } | { ok: false; error: string }> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = normalizeCode(data.code);
    if (!isCodeFormatValid(code)) return { ok: false, error: "Code: 3–40 Zeichen, nur Buchstaben, Zahlen, Bindestrich und Unterstrich." };
    if (data.type === "percent" && data.value > 100) return { ok: false, error: "Prozent darf höchstens 100 sein." };
    const { error } = await supabaseAdmin.from("discount_codes").insert({
      code,
      type: data.type,
      value: data.value,
      max_uses: data.maxUses,
      valid_until: data.validUntil,
      note: data.note,
      created_by: context.userId,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") return { ok: false, error: `Der Code „${code}“ existiert schon.` };
      return { ok: false, error: "Der Code konnte nicht gespeichert werden." };
    }
    return { ok: true, code };
  });

export const setDiscountCodeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_codes").update({ active: data.active }).eq("id", data.id);
    return { ok: !error };
  });

export const deleteDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_codes").delete().eq("id", data.id);
    return { ok: !error };
  });
