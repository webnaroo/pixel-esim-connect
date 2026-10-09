/**
 * The "what happens next" list on the order page.
 *
 * Pure mapping from an order status to three visible steps, so the wording on
 * the page can never claim a step is finished that the order has not reached.
 */

export type StepState = "done" | "current" | "open";

export type OrderStep = {
  key: "order" | "payment" | "install";
  title: string;
  note: string;
  state: StepState;
};

/** Statuses where the payment really reached us (also the ones we later refund). */
const PAID = new Set([
  "paid",
  "fulfilling",
  "needs_review",
  "payment_mismatch",
  "fulfilled",
  "fulfillment_failed",
  "refunded",
]);

/** Orders that are over – installing an eSIM is no longer part of them. */
const CLOSED = new Set(["cancelled", "refunded"]);

export function orderSteps(status: string): OrderStep[] {
  const paid = PAID.has(status);
  const closed = CLOSED.has(status);

  return [
    {
      key: "order",
      title: "Bestellung eingegangen",
      note: "Wir haben deine Bestellung notiert.",
      state: "done",
    },
    {
      key: "payment",
      title: "Zahlung bestätigt",
      note: paid
        ? "Der Betrag ist bei uns eingegangen."
        : status === "cancelled"
          ? "Diese Bestellung wurde abgebrochen."
          : "Sobald die Zahlung bei uns ist, geht es automatisch weiter.",
      state: paid ? "done" : status === "cancelled" ? "open" : "current",
    },
    {
      key: "install",
      title: "eSIM installieren",
      note: closed
        ? "Entfällt bei dieser Bestellung."
        : status === "fulfilled"
          ? "Dein QR-Code ist bereit."
          : paid
            ? "Du bekommst den QR-Code, sobald die eSIM fertig ist."
            : "Nach der Zahlung stellen wir deine eSIM zusammen.",
      state:
        status === "fulfilled"
          ? "done"
          : paid && !closed
            ? "current"
            : "open",
    },
  ];
}
