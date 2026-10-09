// Browser-safe labels and rules for stored eSIMerge webhook events (no server imports).

export const WEBHOOK_STATUS_LABEL: Record<string, string> = { pending: "Wartet", processed: "Verarbeitet", ignored: "Ignoriert", failed: "Fehlgeschlagen" };

export const WEBHOOK_REASON_LABEL: Record<string, string> = {
  test_event: "Testnachricht",
  order_not_found: "Bestellung nicht gefunden",
  unknown_event_type: "Unbekannter Ereignistyp",
  mode_mismatch: "Test/Live passt nicht zur Bestellung",
  mode_conflict: "Modus im Inhalt widerspricht dem Geheimnis",
  no_provider_order: "Bestellung hat keine eSIMerge-Nummer",
  not_confirmed_by_api: "Status nicht bestätigt",
  cancelled_by_provider: "Von eSIMerge storniert – Erstatten prüfen",
  already_cancelled: "Schon storniert",
  already_fulfilled: "Bestellung schon geliefert",
  invalid_threshold: "Ungültige Verbrauchsstufe",
  unparseable: "Nachricht nicht lesbar",
};

export const webhookReasonLabel = (code: string | null | undefined) => (code ? WEBHOOK_REASON_LABEL[code] ?? code : "");

/** A validly signed event that was stored and handled (processed or deliberately ignored) proves the webhook works. */
export const WEBHOOK_READY_STATUSES = ["processed", "ignored"] as const;
export function webhookDeliveryVerified(events: { signature_valid: boolean; status: string }[]): boolean {
  return events.some((e) => e.signature_valid && (WEBHOOK_READY_STATUSES as readonly string[]).includes(e.status));
}

/** Red alert counts only unresolved live events tied to a real order; test messages never count. */
export function webhookNeedsAttention(e: { mode: string; order_id: string | null; error: string | null; status: string; event_type: string; resolved_at?: string | null }): boolean {
  if (e.mode !== "live" || !e.order_id || e.error === "test_event" || e.resolved_at) return false;
  return e.status === "failed" || e.event_type === "order.failed" || e.event_type === "order.topup.failed";
}

/** "Request still running" alerts are obsolete once the order reached issued or later. */
export const ORDER_PAST_ISSUED = ["fulfilled", "refunded", "cancelled", "expired"];
