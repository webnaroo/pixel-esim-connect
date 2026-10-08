// Single gateway for all payment calls. TODO(STRIPE): implemented once Lovable's built-in
// Stripe payments are enabled (test environment first). Until then every call refuses honestly.
export class PaymentNotConfiguredError extends Error {
  readonly code = "E-PAYMENT-NOT-CONFIGURED";
  constructor() {
    super("Zahlungsanbieter ist noch nicht verbunden.");
    this.name = "PaymentNotConfiguredError";
  }
}

export function paymentsConfigured(): boolean {
  return false; // TODO(STRIPE)
}

export async function createPayment(_input: { orderId: string; amountCents: number; currency: string; email: string }): Promise<{ clientSecret: string; paymentIntentId: string }> {
  throw new PaymentNotConfiguredError();
}

export async function refundPayment(_paymentIntentId: string): Promise<{ refundId: string }> {
  throw new PaymentNotConfiguredError();
}
