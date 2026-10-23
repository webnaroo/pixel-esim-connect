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
      // Unpaid checkouts (pending/expired) are never shown to customers.
      sb.from("orders").select("id,status,amount,currency,created_at,plan_snapshot,email_status,is_test").eq("user_id", context.userId).not("status", "in", "(pending,expired)").order("created_at", { ascending: false }),
      sb.from("esims").select("order_id,status,iccid,expires_at,provider_esim_id,usage_cache,usage_checked_at,created_at,activated_at,usage_threshold").eq("user_id", context.userId).order("created_at", { ascending: false }),
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
        activatedAt: e.activated_at,
        usageThreshold: e.usage_threshold,
        usageAvailable: Boolean(e.provider_esim_id),
        usage: (e.usage_cache ?? null) as { usedMb: number; totalMb: number | null } | null,
        plan: ((byOrder.get(e.order_id)?.plan_snapshot ?? {}) as PlanSnap),
      })),
    };
  });

export const myAccountQuery = () => queryOptions({ queryKey: ["account"], queryFn: () => getMyAccount() });

/** Own role check after sign-in — decides the landing page (admins go to /admin). */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: Boolean(isAdmin) };
  });

/** Installation data only for the owner, only on request; never logged. */
export const getMyInstallData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("orders").select("id,status").eq("id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (!own || own.status !== "fulfilled") return null;
    // Same rule as the e-mail link: no install data after refund/cancellation (status check above).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: e } = await supabaseAdmin
      .from("esims")
      .select("lpa_string,smdp_address,activation_code,ios_install_url,android_install_url,user_id")
      .eq("order_id", own.id)
      .maybeSingle();
    if (!e || e.user_id !== context.userId) return null;
    return { lpa: e.lpa_string, smdp: e.smdp_address, activationCode: e.activation_code, iosUrl: e.ios_install_url, androidUrl: e.android_install_url };
  });

/** App-Gerät für Push-Mitteilungen anmelden (nur eingeloggte Kunden, ein Token gehört genau einem Konto). */
export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ token: z.string().min(20).max(4096).regex(/^\S+$/), platform: z.enum(["android", "ios"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_devices").upsert({ user_id: context.userId, token: data.token, platform: data.platform, last_seen_at: new Date().toISOString() }, { onConflict: "token" });
    if (error) throw new Error("Mitteilungen konnten nicht aktiviert werden.");
    return { ok: true };
  });

export const unregisterPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ token: z.string().min(20).max(4096) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_devices").delete().eq("user_id", context.userId).eq("token", data.token);
    return { ok: true };
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

/** Customer asks for a refund: creates one open support ticket per order (no automatic payout). */
export const requestMyRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid(), reason: z.string().trim().max(1000).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("orders").select("id,status,guest_email").eq("id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (!o) return { ok: false as const, error: "Bestellung nicht gefunden." };
    if (["pending", "expired", "refunded", "cancelled"].includes(o.status)) return { ok: false as const, error: "Für diese Bestellung ist keine Erstattung möglich." };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const subject = `Erstattung beantragt: Nr. ${o.id.slice(0, 8)}`;
    const { data: open } = await db.from("support_tickets").select("id").eq("order_id", o.id).eq("subject", subject).neq("status", "closed").limit(1);
    if (open?.length) return { ok: true as const, already: true };
    const { data: p } = await db.from("profiles").select("email").eq("id", context.userId).maybeSingle();
    const { error } = await db.from("support_tickets").insert({ user_id: context.userId, email: p?.email ?? o.guest_email, subject, order_id: o.id, message: data.reason || "Kunde beantragt eine Erstattung über „Mein Konto“." });
    if (error) return { ok: false as const, error: "Antrag konnte nicht gesendet werden." };
    await db.from("audit_log").insert({ actor_id: context.userId, action: "customer_refund_requested", entity: "order", entity_id: o.id });
    // Notify every admin by mail (best effort; the request is already saved and shown in the admin).
    try {
      const { loadEmailSettings } = await import("./email.server");
      const { canSendCustomerEmail } = await import("./email-rules");
      const st = await loadEmailSettings();
      if (canSendCustomerEmail(st)) {
        const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "admin");
        const { data: admins } = await db.from("profiles").select("email").in("id", (roles ?? []).map((r) => r.user_id));
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        const { SITE_URL } = await import("./seo");
        for (const a of admins ?? []) {
          if (!a.email) continue;
          await sendTemplateEmail("admin-refund-request", a.email, {
            templateData: { orderId: o.id.slice(0, 8), customer: p?.email ?? o.guest_email, reason: data.reason || undefined, url: `${SITE_URL}/admin` },
            fromLocal: st.from_local, replyTo: st.reply_to, idempotencyKey: `admin-refund-request-${o.id}-${a.email}`,
          }).catch(() => undefined);
        }
      }
    } catch { console.error("admin_refund_mail_failed", o.id); }
    return { ok: true as const, already: false };
  });
