// Masks secrets before anything is logged or shown in the admin API explorer.

const SENSITIVE_KEY_PARTS = [
  "token", "apikey", "secret", "password", "authorization", "auth", "cookie",
  "activationcode", "matchingid", "lpa", "qr", "smdp", "pin", "puk", "iccid", "installurl", "carddata",
];

const VALUE_PATTERNS: RegExp[] = [
  /LPA:1\$[^\s"']+/gi, // full eSIM activation string
  /\besm_sk_[A-Za-z0-9_]+/g, // eSIMerge keys
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(sk|pk|rk|whsec|sb_secret)_[A-Za-z0-9_]{8,}\b/g, // Stripe / backend keys
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, // JWTs
];

export const MASK = "***";

export function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[-_\s]/g, "");
  return SENSITIVE_KEY_PARTS.some((p) => k.includes(p));
}

export function maskString(s: string): string {
  return VALUE_PATTERNS.reduce((acc, re) => acc.replace(re, MASK), s);
}

export function maskSensitive(value: unknown): unknown {
  if (typeof value === "string") return maskString(value);
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, isSensitiveKey(k) && v != null && v !== "" ? MASK : maskSensitive(v)]),
    );
  }
  return value;
}
