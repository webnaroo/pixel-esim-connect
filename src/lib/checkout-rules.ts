import { z } from "zod";

/** Checkout request. Strict: the client can never send a price, amount or currency. */
export const checkoutRequestSchema = z
  .object({
    planId: z.string().uuid(),
    email: z.string().trim().toLowerCase().email().max(254),
    withdrawalConsent: z.literal(true),
    environment: z.enum(["sandbox", "live"]),
    returnOrigin: z.string().url().max(200).refine((u) => /^https:\/\/|^http:\/\/localhost(:\d+)?$/.test(u), "invalid origin"),
  })
  .strict();

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export type CheckoutError = "shop_unavailable" | "plan_unavailable" | "price_unavailable" | "payment_unavailable" | "invalid_request" | "rate_limited";
