// Pure discount-code rules. No I/O — callers pass code rows and prices.
// Codes are created by admins in the admin panel and redeemed at checkout.

import { z } from "zod";

/** Uppercase letters, digits, dash and underscore; 3–40 chars; must start alphanumeric. */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isCodeFormatValid(normalized: string): boolean {
  return CODE_PATTERN.test(normalized);
}

export type DiscountType = "percent" | "fixed";

/** Admin-side input for creating a code. */
export const discountCreateSchema = z.object({
  code: z.string().min(1).max(60),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(100_000),
  maxUses: z.number().int().positive().max(1_000_000).nullable(),
  validUntil: z.string().datetime({ offset: true }).nullable(),
  note: z.string().max(500).nullable(),
});
export type DiscountCreateInput = z.infer<typeof discountCreateSchema>;

/** Public checkout input. Only the code travels from the browser. */
export const discountRedeemSchema = z.object({
  code: z.string().min(1).max(60),
});

export type DiscountRow = {
  type: string;
  value: number;
  active: boolean;
  valid_until: string | null;
  max_uses: number | null;
  times_used: number;
};

export type DiscountRejection = "invalid_format" | "inactive" | "expired" | "exhausted";

/** Why a code cannot be redeemed, or null when it can. */
export function discountRejection(row: DiscountRow, normalized: string, now = new Date()): DiscountRejection | null {
  if (!isCodeFormatValid(normalized)) return "invalid_format";
  if (!row.active) return "inactive";
  if (row.valid_until && new Date(row.valid_until).getTime() <= now.getTime()) return "expired";
  if (row.max_uses != null && row.times_used >= row.max_uses) return "exhausted";
  if (row.type !== "percent" && row.type !== "fixed") return "inactive";
  return null;
}

export const REJECTION_MESSAGES: Record<DiscountRejection, string> = {
  invalid_format: "Dieser Code hat ein ungültiges Format.",
  inactive: "Dieser Code ist nicht mehr gültig.",
  expired: "Dieser Code ist abgelaufen.",
  exhausted: "Dieser Code wurde zu oft benutzt.",
};

/** Discount amount in currency units, rounded to cents and capped at the gross price. */
export function discountAmount(d: { type: DiscountType; value: number }, gross: number): number {
  const grossCents = Math.round(gross * 100);
  const raw = d.type === "percent" ? Math.round((grossCents * d.value) / 100) : Math.round(d.value * 100);
  return Math.min(raw, grossCents) / 100;
}

/** Split the discounted gross into net/vat proportionally (same VAT rate). */
export function discountedTotals(gross: number, discount: number, vatRate: number): { gross: number; net: number; vat: number } {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const newGross = r2(r2(gross) - r2(discount));
  const net = r2(newGross / (1 + vatRate));
  const vat = r2(newGross - net);
  return { gross: newGross, net, vat };
}
