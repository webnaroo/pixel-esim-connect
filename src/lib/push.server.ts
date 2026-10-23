// Versand der App-Mitteilungen über Firebase Cloud Messaging (HTTP v1).
// Darf nie eine Auslieferung oder Mail stören: alle Fehler werden geschluckt und nur als Code protokolliert.
import { buildServiceJwt, parseServiceAccount, type ServiceAccount } from "./fcm-auth";
import { buildPushMessage, type PushKind, type PushMessage } from "./push";

let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const jwt = await buildServiceJwt(sa, now);
  const res = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  cached = { token: j.access_token, exp: now + (j.expires_in ?? 3000) };
  return j.access_token;
}

type SendResult = "ok" | "invalid_token" | "error";

async function sendOne(sa: ServiceAccount, bearer: string, deviceToken: string, msg: PushMessage): Promise<SendResult> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ message: { token: deviceToken, notification: { title: msg.title, body: msg.body }, data: { path: msg.path }, android: { priority: "HIGH" } } }),
  });
  if (res.ok) return "ok";
  // 404 = Token nicht mehr gültig (App gelöscht); 400 mit INVALID_ARGUMENT = Token kaputt.
  if (res.status === 404) return "invalid_token";
  if (res.status === 400) {
    const t = await res.text().catch(() => "");
    if (t.includes("INVALID_ARGUMENT") && t.toLowerCase().includes("token")) return "invalid_token";
  }
  return "error";
}

export async function sendPushToUser(userId: string, msg: PushMessage): Promise<{ sent: number; removed: number; configured: boolean }> {
  const sa = parseServiceAccount(process.env["FCM_SERVICE_ACCOUNT_JSON"]);
  if (!sa) return { sent: 0, removed: 0, configured: false };
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: devices } = await db.from("push_devices").select("id,token").eq("user_id", userId);
  if (!devices?.length) return { sent: 0, removed: 0, configured: true };
  const bearer = await accessToken(sa);
  if (!bearer) return { sent: 0, removed: 0, configured: false };
  let sent = 0;
  const dead: string[] = [];
  for (const d of devices) {
    const r = await sendOne(sa, bearer, d.token, msg);
    if (r === "ok") sent++;
    else if (r === "invalid_token") dead.push(d.id);
  }
  if (dead.length) await db.from("push_devices").delete().in("id", dead);
  return { sent, removed: dead.length, configured: true };
}

/** Mitteilung zu einer Bestellung an den angemeldeten Besitzer (Gast-Bestellungen haben kein App-Gerät). */
export async function notifyOrderPush(orderId: string, kind: PushKind, extra: { threshold?: number; daysLeft?: number } = {}): Promise<{ configured: boolean; sent: number }> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: order } = await db.from("orders").select("user_id,plan_snapshot").eq("id", orderId).maybeSingle();
    if (!order?.user_id) return { configured: true, sent: 0 };
    const snap = (order.plan_snapshot ?? {}) as { destination?: string };
    const msg = buildPushMessage(kind, { plan: snap.destination ?? null, threshold: extra.threshold, daysLeft: extra.daysLeft });
    if (!msg) return { configured: true, sent: 0 };
    const r = await sendPushToUser(order.user_id, msg);
    return { configured: r.configured, sent: r.sent };
  } catch (e) {
    console.error("push_failed", orderId, kind, (e as { code?: string }).code ?? "error");
    return { configured: false, sent: 0 };
  }
}
