// Pure decision for verified payment webhooks. The browser redirect after payment never changes an order;
// only a signature-verified webhook reaching this function can mark it paid.
export type OrderForPayment = { status: string; amount: number; currency: string; stripeEnv: string | null };
export type PaidSessionInfo = { amountTotal: number | null; currency: string | null; paymentStatus: string; env: "sandbox" | "live" };
export type PaymentDecision = { action: "mark_paid" } | { action: "mismatch"; reason: string } | { action: "ignore"; reason: string };

export function decidePayment(order: OrderForPayment, s: PaidSessionInfo): PaymentDecision {
  if (order.status !== "pending") return { action: "ignore", reason: `order already ${order.status}` };
  if (s.paymentStatus === "unpaid") return { action: "ignore", reason: "payment not settled yet" };
  if (order.stripeEnv && order.stripeEnv !== s.env) return { action: "mismatch", reason: `environment ${s.env} != ${order.stripeEnv}` };
  const expectedCents = Math.round(order.amount * 100);
  if (s.amountTotal !== expectedCents) return { action: "mismatch", reason: `amount ${s.amountTotal} != ${expectedCents}` };
  if ((s.currency ?? "").toLowerCase() !== order.currency.toLowerCase()) return { action: "mismatch", reason: `currency ${s.currency} != ${order.currency}` };
  return { action: "mark_paid" };
}
