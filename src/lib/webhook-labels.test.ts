
import { webhookNeedsAttention as needs } from "./webhook-labels";
describe("webhookNeedsAttention", () => {
  const base = { mode: "live", order_id: "o1", error: null, status: "failed", event_type: "order.failed" };
  it("zählt ungeprüfte Live-Fehler zu echter Bestellung", () => expect(needs(base)).toBe(true));
  it("Testnachricht zählt nicht", () => expect(needs({ ...base, error: "test_event" })).toBe(false));
  it("Sandbox zählt nicht", () => expect(needs({ ...base, mode: "sandbox" })).toBe(false));
  it("ohne Bestellung zählt nicht", () => expect(needs({ ...base, order_id: null })).toBe(false));
  it("erledigt zählt nicht", () => expect(needs({ ...base, resolved_at: "2026-10-09" })).toBe(false));
});
