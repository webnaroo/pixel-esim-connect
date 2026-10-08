import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";
const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

// Derived from the token prefix; missing/unknown never falls back to live.
function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Zahlungen sind für diese Version noch nicht eingerichtet.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export const paymentsTokenState = (): "test" | "live" | "missing" =>
  clientToken?.startsWith("pk_test_") ? "test" : clientToken?.startsWith("pk_live_") ? "live" : "missing";
