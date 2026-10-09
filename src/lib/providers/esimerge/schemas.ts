import { z } from "zod";

// Schemas derived from real eSIMerge SANDBOX responses (see sandbox.fixtures.ts). Unknown fields are allowed.

const coverageEntry = z.object({
  country_code: z.string().nullable(),
  country_name: z.string().nullable().optional(),
  networks: z.array(z.string()).optional(),
});

export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  scope: z.string(), // seen: country | region | global
  type: z.string(), // seen: fixed | unlimited | calling
  country_code: z.string().nullable().optional(),
  region_code: z.string().nullable().optional(),
  data_mb: z.number().nullable(),
  minutes: z.number().nullable().optional(),
  sms: z.number().nullable().optional(),
  validity_days: z.number().int().positive(),
  price_usd: z.number().nonnegative(),
  currency: z.string(),
  fair_usage: z.string().nullable().optional(),
  supports_topup: z.boolean().optional(),
  networks: z.array(z.string()).optional(),
  coverage: z.array(coverageEntry).optional(),
});
export type EsmPlan = z.infer<typeof planSchema>;

export const listSchema = z.object({
  object: z.literal("list"),
  data: z.array(z.unknown()),
  has_more: z.boolean().optional(),
  next_offset: z.number().nullable().optional(),
});

export const esimSchema = z.object({
  id: z.string(),
  order_id: z.string().optional(),
  status: z.string(), // seen: pending (becomes active after ~60 s in sandbox)
  iccid: z.string().nullable().optional(),
  qr_code: z.string().nullable().optional(), // LPA string, not an image
  smdp_address: z.string().nullable().optional(),
  activation_code: z.string().nullable().optional(),
  ios_install_url: z.string().nullable().optional(),
  android_install_url: z.string().nullable().optional(),
  activated_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  expired: z.boolean().optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  object: z.literal("order"),
  status: z.string(), // documented: pending | issued | active | expired | cancelled | failed
  esim: esimSchema.nullable().optional(),
  amount_usd: z.number().nullable().optional(),
  customer_reference: z.string().nullable().optional(),
  activated_at: z.string().nullable().optional(),
  error: z.object({ code: z.string().nullable().optional(), message: z.string().nullable().optional() }).nullable().optional(),
});

export const usageSchema = z.object({
  object: z.literal("usage"),
  status: z.string(),
  data_used_mb: z.number(),
  data_allowed_mb: z.number().nullable(),
  data_remaining_mb: z.number().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  expired: z.boolean().optional(),
});
