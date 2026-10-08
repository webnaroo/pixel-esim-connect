import { z } from "zod";

/** Checkout request. Strict: the client can never send a price, amount or currency. */
export const checkoutRequestSchema = z
  .object({
    planId: z.string().uuid(),
    email: z.string().trim().toLowerCase().email().max(254),
    withdrawalConsent: z.literal(true),
  })
  .strict();

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export type CheckoutError = "shop_unavailable" | "plan_unavailable" | "price_unavailable" | "payment_unavailable" | "invalid_request" | "rate_limited";
