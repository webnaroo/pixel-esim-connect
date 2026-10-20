// Go-live admin: email settings/test/previews, Stripe info, receipt data, price check after sync.
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string; claims?: { email?: string } };
async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function saveMail(patch: Record<string, unknown>) {
  const db = await admin();
  const { data } = await db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle();
  const value = { ...((data?.value ?? {}) as Record<string, unknown>), ...patch };
  await db.from("app_settings").upsert({ key: "email_settings", value: value as never, updated_at: new Date().toISOString() });
}

// Customer emails shown in the admin list (template name + where it is sent from).
const CUSTOMER_MAILS = [
  { template: "order-ready", when: "Nach erfolgreicher Bereitstellung der eSIM" },
  { template: "order-problem", when: "Wenn eSIMerge die Bestellung als fehlgeschlagen meldet" },
  { template: "usage-alert", when: "Bei 80 % und 100 % Verbrauch (je einmal)" },
  { template: "refund-notice", when: "Nach automatischer Erstattung" },
] as const;

export const getGoLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const db = await admin();
    const React = await import("react");
    const { render } = await import("@react-email/render");
    const { TEMPLATES } = await import("./email-templates/registry");
    const { parseEmailSettings } = await import("./email-rules");
    const { receiptGaps } = await import("./golive-rules");
    const [{ data: mail }, { data: company }, { data: disputes }, { data: smallest }] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle(),
      db.from("app_settings").select("value").eq("key", "company_info").maybeSingle(),
      db.from("orders").select("id,dispute_status,dispute_due_by,amount,created_at").not("dispute_status", "is", null).order("created_at", { ascending: false }).limit(20),
      db.from("public_plans").select("id,sell_price,data_mb,validity_days,destination:destinations(name_de)").order("sell_price").limit(1).maybeSingle(),
    ]);
    const settings = parseEmailSettings(mail?.value);
    const sensitive = /(LPA:1\$|activation_code|smdp|matching_id)/i;
    const mails = [];
    for (const m of CUSTOMER_MAILS) {
      const t = TEMPLATES[m.template]!;
      const html = await render(React.createElement(t.component, t.previewData ?? {}));
      mails.push({ template: m.template, name: t.displayName ?? m.template, when: m.when, subject: typeof t.subject === "function" ? t.subject(t.previewData ?? {}) : t.subject, html, plainCodeFree: !sensitive.test(html) });
    }
    const userEmail = (context as unknown as Ctx).claims?.email ?? null;
    return {
      email: { ...settings, adminEmail: userEmail, fromAddress: `${settings.from_local}@${settings.sender_domain}` },
      mails,
      company: (company?.value ?? null) as Record<string, string> | null,
      receiptGaps: receiptGaps((company?.value ?? null) as Record<string, unknown> | null),
      stripe: { liveKey: Boolean(process.env["STRIPE_LIVE_API_KEY"]), sandboxKey: Boolean(process.env["STRIPE_SANDBOX_API_KEY"]), liveSecret: Boolean(process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"]), sandboxSecret: Boolean(process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"]) },
      disputes: disputes ?? [],
      smallestPlan: smallest ? { id: smallest.id, price: Number(smallest.sell_price), name: `${(smallest.destination as { name_de?: string } | null)?.name_de ?? ""} · ${smallest.validity_days} Tage` } : null,
    };
  });
export const goLiveQuery = () => queryOptions({ queryKey: ["admin", "golive"], queryFn: () => getGoLive() });

export const saveEmailSender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ fromLocal: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{1,40}$/), replyTo: z.string().trim().email().max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    // Changing the reply address requires confirming it again.
    const { parseEmailSettings } = await import("./email-rules");
    const db = await admin();
    const { data: cur } = await db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle();
    const prev = parseEmailSettings(cur?.value);
    await saveMail({ from_local: data.fromLocal, reply_to: data.replyTo.toLowerCase(), ...(prev.reply_to !== data.replyTo.toLowerCase() ? { reply_confirmed_at: null } : {}) });
    await db.from("audit_log").insert({ actor_id: context.userId, action: "email_sender_changed", entity: "app_settings", entity_id: "email_settings", meta: data });
    return { ok: true };
  });

export const confirmReplyTo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ confirmed: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    await saveMail({ reply_confirmed_at: data.confirmed ? new Date().toISOString() : null });
    const db = await admin();
    await db.from("audit_log").insert({ actor_id: context.userId, action: data.confirmed ? "reply_to_confirmed" : "reply_to_unconfirmed", entity: "app_settings", entity_id: "email_settings" });
    return { ok: true };
  });

const REASONS: Record<string, string> = {
  recipient_suppressed: "Empfänger ist gesperrt (früherer Bounce/Abmeldung)",
  emails_disabled: "E-Mail-Versand ist im Projekt ausgeschaltet",
  sender_domain_not_verified: "Absender-Domain ist nicht verifiziert",
  no_admin_email: "Keine Admin-Adresse gefunden",
};

export const sendAdminTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const to = (context as unknown as Ctx).claims?.email;
    const at = new Date().toISOString();
    const { loadEmailSettings } = await import("./email.server");
    const { canSendCustomerEmail } = await import("./email-rules");
    const s = await loadEmailSettings();
    const done = async (ok: boolean, reason?: string) => {
      await saveMail({ test_sent_at: at, test_result: { ok, at, ...(reason ? { reason } : {}) } });
      return { ok, reason: reason ? (REASONS[reason] ?? reason) : undefined, to: to ?? null };
    };
    if (!to) return done(false, "no_admin_email");
    if (!canSendCustomerEmail(s)) return done(false, "sender_domain_not_verified");
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const r = await sendTemplateEmail("admin-test", to, { templateData: { at: new Date(at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) }, fromLocal: s.from_local, replyTo: s.reply_to });
      return r.sent ? done(true) : done(false, r.reason);
    } catch (e) {
      const code = (e as { code?: string }).code;
      return done(false, code ?? (e instanceof Error ? e.message.slice(0, 160) : "Unbekannter Fehler"));
    }
  });

// ---------- Price check ----------
export const getPriceCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { getPriceCheckData } = await import("./price-check.server");
    return getPriceCheckData();

  });
export const priceCheckQuery = () => queryOptions({ queryKey: ["admin", "price-check"], queryFn: () => getPriceCheck() });

export const releasePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ planIds: z.array(z.string().uuid()).min(1).max(5000) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const db = await admin();
    // Chunked: a long `in (...)` list would exceed the URL limit of the REST API.
    for (let i = 0; i < data.planIds.length; i += 200) {
      const { error } = await db.from("plans").update({ released: true }).in("id", data.planIds.slice(i, i + 200));
      if (error) throw new Error("Tarife konnten nicht freigegeben werden.");
    }
    await db.from("audit_log").insert({ actor_id: context.userId, action: "plans_released", entity: "plans", meta: { count: data.planIds.length, ids: data.planIds } as never });
    return { ok: true, count: data.planIds.length };
  });
