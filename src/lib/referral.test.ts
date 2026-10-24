import { describe, expect, it } from "vitest";
import { generateReferralCode, normalizeReferralCode, referralLink, rewardAllowed, REFERRAL_MAX_REWARDS } from "./referral";

describe("referral rules", () => {
  it("generates 8 unambiguous characters", () => {
    const c = generateReferralCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
  it("normalizes codes", () => {
    expect(normalizeReferralCode(" ab-cd 2345 ")).toBe("ABCD2345");
    expect(normalizeReferralCode("abc")).toBeNull();
    expect(normalizeReferralCode("A".repeat(13))).toBeNull();
  });
  it("builds a link", () => expect(referralLink("https://globesim.de", "ABCD2345")).toBe("https://globesim.de/register?ref=ABCD2345"));
  it("rewards only real first purchases within the limit", () => {
    expect(rewardAllowed({ cashCents: 1, alreadyRewarded: false, referrerRewardCount: 0 })).toBe(true);
    expect(rewardAllowed({ cashCents: 0, alreadyRewarded: false, referrerRewardCount: 0 })).toBe(false);
    expect(rewardAllowed({ cashCents: 900, alreadyRewarded: true, referrerRewardCount: 0 })).toBe(false);
    expect(rewardAllowed({ cashCents: 900, alreadyRewarded: false, referrerRewardCount: REFERRAL_MAX_REWARDS })).toBe(false);
  });
});
