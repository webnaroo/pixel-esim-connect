// GlobeMoney: Gutschrift vergeben und Kontostand lesen. Nur Server. Das Einsetzen von Guthaben passiert atomar in der Datenbank
// (claim_loyalty_credit), niemals hier aus einem Kontostand, den der Browser kennt.
import { EARN_STATUSES, cashbackCents, nextTier, tierForSpend, toCents, toEuro } from "./loyalty";

/** Umsatz für die Stufe: bezahlte Bestellungen (in bar) plus von Hand gebuchte Gutschriften, die für die Stufe zählen. */
async function tierSpendCents(userId: string, opts: { excludeOrderId?: string; beforeCreatedAt?: string } = {}): Promise<number> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  let orders = db.from("orders").select("amount").eq("user_id", userId).eq("is_test", false).in("status", [...EARN_STATUSES]);
  if (opts.excludeOrderId) orders = orders.neq("id", opts.excludeOrderId);
  if (opts.beforeCreatedAt) orders = orders.lt("created_at", opts.beforeCreatedAt);
  const [{ data: rows }, { data: adj }] = await Promise.all([orders, db.from("loyalty_adjustments").select("amount").eq("user_id", userId).eq("counts_for_tier", true).gt("amount", 0)]);
  const cash = (rows ?? []).reduce((s, o) => s + toCents(Number(o.amount)), 0);
  const gifted = (adj ?? []).reduce((s, a) => s + toCents(Number(a.amount)), 0);
  return cash + gifted;
}

/** Vergibt die Gutschrift einer bezahlten Bestellung genau einmal. Gäste und Testbestellungen bekommen nichts. */
export async function awardLoyalty(orderId: string): Promise<{ awardedCents: number }> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: order } = await db.from("orders").select("id,user_id,is_test,amount,status,credit_earned,created_at").eq("id", orderId).maybeSingle();
    if (!order?.user_id || order.is_test || order.credit_earned !== null) return { awardedCents: 0 };
    if (!(EARN_STATUSES as readonly string[]).includes(order.status)) return { awardedCents: 0 };
    // Stufe nach dem Umsatz der früheren Bestellungen und der Gutschriften von Hand (der aktuelle Kauf zählt erst für den nächsten).
    const spend = await tierSpendCents(order.user_id, { excludeOrderId: order.id, beforeCreatedAt: order.created_at });
    const tier = tierForSpend(spend);
    const earned = cashbackCents(toCents(Number(order.amount)), tier.rate);
    const { data: updated } = await db.from("orders").update({ credit_earned: toEuro(earned) }).eq("id", order.id).is("credit_earned", null).select("id");
    if (!updated?.length) return { awardedCents: 0 };
    await db.from("audit_log").insert({ action: "loyalty_earned", entity: "order", entity_id: order.id, meta: { cents: earned, tier: tier.id, spend_cents: spend } });
    return { awardedCents: earned };
  } catch (e) {
    // Darf nie die Auslieferung stören.
    console.error("loyalty_award_failed", orderId, (e as { code?: string }).code ?? "error");
    return { awardedCents: 0 };
  }
}

export async function loyaltySummary(userId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [spendCents, { data: balance }] = await Promise.all([tierSpendCents(userId), db.rpc("loyalty_balance", { _user: userId })]);
  const tier = tierForSpend(spendCents);
  const next = nextTier(spendCents);
  return {
    spendCents,
    balanceCents: toCents(Number(balance ?? 0)),
    tier: { id: tier.id, label: tier.label, rate: tier.rate },
    next: next ? { label: next.tier.label, rate: next.tier.rate, remainingCents: next.remainingCents } : null,
  };
}
