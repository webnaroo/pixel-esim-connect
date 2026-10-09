// Pure rules for eSIMerge order reads (GET /v1/orders/:id) — status mapping, error codes, reference, cost check.

export type EsmOrderStatus = "pending" | "issued" | "active" | "expired" | "cancelled" | "failed" | "unknown";

/** eSIMerge order status → our handling. Unknown values never change anything. */
export function mapOrderStatus(raw: string | null | undefined): EsmOrderStatus {
  const s = (raw ?? "").toLowerCase();
  return (["pending", "issued", "active", "expired", "cancelled", "failed"] as const).find((x) => x === s) ?? (s === "canceled" ? "cancelled" : "unknown");
}

export const ORDER_STATUS_LABEL: Record<EsmOrderStatus, string> = {
  pending: "in Bearbeitung", issued: "geliefert", active: "aktiv", expired: "abgelaufen", cancelled: "storniert", failed: "fehlgeschlagen", unknown: "unbekannt",
};

/** Admin-facing text for an eSIMerge error code. Raw provider messages are never shown to customers. */
export function errorCodeLabel(code: string | null | undefined): string {
  if (!code) return "Unbekannter Fehler bei eSIMerge";
  if (/insufficient|balance|credit|fund|guthaben/i.test(code)) return "Guthaben bei eSIMerge aufladen";
  return `eSIMerge-Fehler ${code}`;
}

/** customer_reference sent on createOrder: our order id only (no e-mail, no name), max 120 chars. */
export function buildCustomerReference(orderId: string): string {
  return orderId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 120);
}

/** Actual purchase price vs. catalog price (USD). Returns a warning text, or null when equal. */
export function costDeviation(actualUsd: number | null | undefined, catalogUsd: number | null | undefined): string | null {
  if (actualUsd == null || catalogUsd == null || !Number.isFinite(actualUsd) || !Number.isFinite(catalogUsd)) return null;
  if (Math.abs(actualUsd - catalogUsd) < 0.005) return null;
  const f = (n: number) => n.toFixed(2).replace(".", ",");
  return `Einkaufspreis weicht vom Katalog ab: ${f(actualUsd)} statt ${f(catalogUsd)} USD`;
}
