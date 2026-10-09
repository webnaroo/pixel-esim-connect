import { describe, expect, it } from "vitest";
import { isPurchaseTrackable } from "./meta-pixel";

describe("Meta Purchase rule", () => {
  it("fires for a server-confirmed paid order", () => expect(isPurchaseTrackable({ status: "paid", isTest: false, amount: 1.99 })).toBe(true));
  it("never fires for pending (unpaid) orders", () => expect(isPurchaseTrackable({ status: "pending", isTest: false, amount: 1.99 })).toBe(false));
  it("never fires for refunded orders", () => expect(isPurchaseTrackable({ status: "refunded", isTest: false, amount: 1.99 })).toBe(false));
  it("never fires for test payments", () => expect(isPurchaseTrackable({ status: "fulfilled", isTest: true, amount: 1.99 })).toBe(false));
});
