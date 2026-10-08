import { describe, expect, it } from "vitest";
import { claimAfterSync, confirmClaim, hasThrottleHint, showsNoThrottle, validateConfirmation } from "./throttle";

const hint = { note: "20GB high-speed then throttled" };
const by = { source: "E-Mail von eSIMerge vom 08.10.2026", date: "2026-10-08", confirmedBy: "u1" };

describe("throttle claim", () => {
  it("detects provider throttle hints", () => {
    expect(hasThrottleHint(hint)).toBe(true);
    expect(hasThrottleHint({ note: "20 GB schnell, danach gedrosselt" })).toBe(true);
    expect(hasThrottleHint({ throttleAfterMb: 1024 })).toBe(true);
    expect(hasThrottleHint(null)).toBe(false);
  });
  it("requires source and date", () => {
    const today = new Date("2026-10-08T12:00:00Z");
    expect(validateConfirmation("", "2026-10-08", today)).not.toBeNull();
    expect(validateConfirmation("E-Mail", "", today)).not.toBeNull();
    expect(validateConfirmation("E-Mail", "2026-10-09", today)).not.toBeNull();
    expect(validateConfirmation("E-Mail", "2026-10-08", today)).toBeNull();
  });
  it("confirmation sets none_confirmed when catalog has no hint", () => {
    expect(confirmClaim(null, { ...by, acceptHint: false }).claim).toBe("none_confirmed");
  });
  it("catalog hint contradicting confirmation → conflict, unless explicitly accepted", () => {
    expect(confirmClaim(hint, { ...by, acceptHint: false }).claim).toBe("conflict");
    const ok = confirmClaim(hint, { ...by, acceptHint: true });
    expect(ok.claim).toBe("none_confirmed");
    expect(claimAfterSync("none_confirmed", ok.confirmation, hint)).toBe("none_confirmed");
  });
  it("sync with new hint on confirmed plan → conflict", () => {
    const c = confirmClaim(null, { ...by, acceptHint: false }).confirmation;
    expect(claimAfterSync("none_confirmed", c, hint)).toBe("conflict");
    expect(claimAfterSync("none_confirmed", c, null)).toBe("none_confirmed");
    expect(claimAfterSync("unknown", null, null)).toBe("unknown");
  });
  it("changed hint after acceptance → conflict again", () => {
    const c = confirmClaim(hint, { ...by, acceptHint: true }).confirmation;
    expect(claimAfterSync("none_confirmed", c, { note: "10GB high-speed then throttled" })).toBe("conflict");
  });
  it("claim shown only for confirmed unlimited plans", () => {
    expect(showsNoThrottle({ type: "unlimited", throttleClaim: "none_confirmed" })).toBe(true);
    expect(showsNoThrottle({ type: "unlimited", throttleClaim: "conflict" })).toBe(false);
    expect(showsNoThrottle({ type: "data", throttleClaim: "none_confirmed" })).toBe(false);
  });
});
