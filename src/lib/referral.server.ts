// Empfehlen & Verdienen: Code, Zuordnung und Belohnung. Nur Server.
import { EARN_STATUSES, toCents, toEuro } from "./loyalty";
import { REFERRAL_REWARD_CENTS, generateReferralCode, normalizeReferralCode, rewardAllowed } from "./referral";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const db = await admin();
  const { data: existing } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (existing) return existing.code;
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const { error } = await db.from("referral_codes").insert({ user_id: userId, code });
    if (!error) return code;
    const { data: again } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (again) return again.code; // parallele Anfrage war schneller
  }
  throw new Error("Empfehlungscode konnte nicht erstellt werden.");
}

export async function referralSummary(userId: string) {
  const db = await admin();
  const code = await ensureReferralCode(userId);
  const { data: rows } = await db.from("referrals").select("rewarded_at").eq("referrer_id", userId);
  const rewarded = (rows ?? []).filter((r) => r.rewarded_at).length;
  return { code, invited: rows?.length ?? 0, rewarded, earnedCents: rewarded * REFERRAL_REWARD_CENTS };
}

export type ApplyResult = "ok" | "invalid" | "own_code" | "already_referred" | "not_new";

/** Ordnet das neue Konto einem Werber zu. Nur, solange das Konto noch nichts bezahlt hat und noch niemandem zugeordnet ist. */
export async function applyReferral(userId: string, rawCode: string): Promise<ApplyResult> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return "invalid";
  const db = await admin();
  const { data: owner } = await db.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  if (!owner) return "invalid";
  if (owner.user_id === userId) return "own_code";
  const { data: has } = await db.from("referrals").select("referred_id").eq("referred_id", userId).maybeSingle();
  if (has) return "already_referred";
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_test", false).in("status", [...EARN_STATUSES]);
  if ((count ?? 0) > 0) return "not_new";
  const { error } = await db.from("referrals").insert({ referred_id: userId, referrer_id: owner.user_id, code });
  if (error) return "already_referred";
  // Der Freund bekommt sein Guthaben sofort, damit er es schon beim ersten Kauf einsetzen kann (wie ein Rabatt).
  const { error: credit } = await db.from("loyalty_adjustments").insert({ user_id: userId, amount: toEuro(REFERRAL_REWARD_CENTS), reason: "Empfehlung: Rabatt auf den ersten Kauf", counts_for_tier: false });
  if (credit) {
    await db.from("referrals").delete().eq("referred_id", userId);
    throw credit;
  }
  return "ok";
}

/** Nach bestätigter Zahlung: erste echte Bestellung eines geworbenen Kontos bringt dem Werber 2 € GlobeMoney, genau einmal (der Freund hat seine 2 € schon bei der Zuordnung bekommen). */
export async function rewardReferral(orderId: string): Promise<void> {
  try {
    const db = await admin();
    const { data: order } = await db.from("orders").select("id,user_id,is_test,amount,status").eq("id", orderId).maybeSingle();
    if (!order?.user_id || order.is_test || !(EARN_STATUSES as readonly string[]).includes(order.status)) return;
    const { data: ref } = await db.from("referrals").select("referrer_id,rewarded_at").eq("referred_id", order.user_id).maybeSingle();
    if (!ref || ref.rewarded_at) return;
    const { count } = await db.from("referrals").select("referred_id", { count: "exact", head: true }).eq("referrer_id", ref.referrer_id).not("rewarded_at", "is", null);
    if (!rewardAllowed({ cashCents: toCents(Number(order.amount)), alreadyRewarded: false, referrerRewardCount: count ?? 0 })) return;
    // Atomarer Anspruch: nur eine Anfrage setzt rewarded_at.
    const { data: claimed } = await db.from("referrals").update({ rewarded_at: new Date().toISOString(), reward_order_id: order.id })
      .eq("referred_id", order.user_id).is("rewarded_at", null).select("referred_id");
    if (!claimed?.length) return;
    const amount = toEuro(REFERRAL_REWARD_CENTS);
    const { error } = await db.from("loyalty_adjustments").insert({ user_id: ref.referrer_id, amount, reason: "Empfehlung: Freund hat gekauft", counts_for_tier: false });
    if (error) {
      await db.from("referrals").update({ rewarded_at: null, reward_order_id: null }).eq("referred_id", order.user_id);
      throw error;
    }
    await db.from("audit_log").insert({ action: "referral_rewarded", entity: "order", entity_id: order.id, meta: { referrer_id: ref.referrer_id, referred_id: order.user_id, cents: REFERRAL_REWARD_CENTS } });
  } catch (e) {
    console.error("referral_reward_failed", orderId, (e as { code?: string }).code ?? "error");
  }
}
