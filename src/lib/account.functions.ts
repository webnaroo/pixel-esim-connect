import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanSnap = { destination?: string; type?: string; data_mb?: number | null; validity_days?: number; throttle_claim?: "unknown" | "none_confirmed" | "conflict" };

/** Own account overview. Activation data is NOT included here (see getMyInstallData). */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: profile }, { data: orders }, { data: esims }] = await Promise.all([
      sb.from("profiles").select("email,name,locale").eq("id", context.userId).maybeSingle(),
      sb.from("orders").select("id,status,amount,currency,created_at,plan_snapshot,email_status,is_test").eq("user_id", context.userId).order("created_at", { ascending: false }),
      sb.from("esims").select("order_id,status,iccid,expires_at,provider_esim_id,usage_cache,usage_checked_at,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }),
    ]);
    const byOrder = new Map((orders ?? []).map((o) => [o.id, o]));
    return {
      profile: profile ?? { email: null, name: null, locale: "de" },
      orders: (orders ?? []).map((o) => ({ ...o, amount: Number(o.amount), plan: (o.plan_snapshot ?? {}) as PlanSnap })),
      esims: (esims ?? []).map((e) => ({
        orderId: e.order_id,
        status: e.status,
        iccidTail: e.iccid ? e.iccid.slice(-4) : null,
        expiresAt: e.expires_at,
        usageAvailable: Boolean(e.provider_esim_id),
        usage: (e.usage_cache ?? null) as { usedMb: number; totalMb: number | null } | null,
        plan: ((byOrder.get(e.order_id)?.plan_snapshot ?? {}) as PlanSnap),
      })),
    };
  });

export const myAccountQuery = () => queryOptions({ queryKey: ["account"], queryFn: () => getMyAccount() });

/** Installation data only for the owner, only on request; never logged. */
export const getMyInstallData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("orders").select("id,status").eq("id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (!own || own.status !== "fulfilled") return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: e } = await supabaseAdmin
      .from("esims")
      .select("lpa_string,smdp_address,activation_code,ios_install_url,android_install_url,user_id")
      .eq("order_id", own.id)
      .maybeSingle();
    if (!e || e.user_id !== context.userId) return null;
    return { lpa: e.lpa_string, smdp: e.smdp_address, activationCode: e.activation_code, iosUrl: e.ios_install_url, androidUrl: e.android_install_url };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ name: z.string().trim().max(120), locale: z.enum(["de", "en"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ name: data.name || null, locale: data.locale }).eq("id", context.userId);
    if (error) throw new Error("Speichern fehlgeschlagen.");
    return { ok: true };
  });

/** GDPR deletion: orders stay (tax law) but are anonymised; installation data is cleared; login is deleted. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ confirm: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { isDeleteConfirmed, anonymizeOrderPatch, ESIM_CLEAR_PATCH } = await import("./anonymize");
    if (!isDeleteConfirmed(data.confirm)) return { ok: false as const, error: "Bitte LÖSCHEN eintippen." };
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin) return { ok: false as const, error: "Admin-Konten können sich nicht selbst löschen. Entferne zuerst die Admin-Rolle." };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: orders } = await db.from("orders").select("id").eq("user_id", uid);
    const now = new Date();
    for (const o of orders ?? []) {
      await db.from("esims").update(ESIM_CLEAR_PATCH).eq("order_id", o.id);
      await db.from("orders").update(anonymizeOrderPatch(o.id, now)).eq("id", o.id);
    }
    await db.from("esims").update(ESIM_CLEAR_PATCH).eq("user_id", uid);
    await db.from("support_tickets").update({ user_id: null, email: "geloescht@anonym.invalid" }).eq("user_id", uid);
    const { error } = await db.auth.admin.deleteUser(uid);
    if (error) return { ok: false as const, error: "Löschen fehlgeschlagen. Bitte wende dich an den Support." };
    await db.from("audit_log").insert({ action: "account_deleted", entity: "account", meta: { orders_anonymized: (orders ?? []).length } });
    return { ok: true as const };
  });
