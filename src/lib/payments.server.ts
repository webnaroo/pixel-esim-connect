// Single gateway for all payment calls (Lovable built-in Stripe, routed via the connector gateway).
import type Stripe from "stripe";
import type { StripeEnv } from "./stripe.server";

export function paymentsConfigured(env: StripeEnv): boolean {
  return Boolean(process.env[env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY"]);
}

async function client(env: StripeEnv) {
  const { createStripeClient } = await import("./stripe.server");
  return createStripeClient(env);
}

async function resolveOrCreateCustomer(stripe: Stripe, options: { email?: string; userId?: string }): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0]!.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0]!;
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/** Embedded checkout session with the server-calculated amount. */
export async function createPayment(input: {
  env: StripeEnv; orderId: string; amountCents: number; currency: string; email: string; userId: string | null; description: string; returnUrl: string;
}): Promise<{ clientSecret: string; sessionId: string }> {
  const stripe = await client(input.env);
  const customer = input.userId ? await resolveOrCreateCustomer(stripe, { email: input.email, userId: input.userId }) : undefined;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "embedded_page",
    return_url: input.returnUrl,
    line_items: [{ quantity: 1, price_data: { currency: input.currency.toLowerCase(), unit_amount: input.amountCents, product_data: { name: input.description } } }],
    ...(customer ? { customer } : { customer_email: input.email }),
    // Frozen price: the session (and its amount) expires after ~30 minutes (Stripe minimum).
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    metadata: { order_id: input.orderId, ...(input.userId && { userId: input.userId }) },
    payment_intent_data: { description: input.description, metadata: { order_id: input.orderId } },
  });
  if (!session.client_secret) throw new Error("Stripe did not return a client secret");
  return { clientSecret: session.client_secret, sessionId: session.id };
}

export async function refundPayment(env: StripeEnv, paymentIntentId: string): Promise<{ refundId: string }> {
  const stripe = await client(env);
  const r = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return { refundId: r.id };
}
