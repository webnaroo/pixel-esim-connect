import { describe, expect, it } from "vitest";
import { maskSensitive } from "./mask";

describe("API explorer masking", () => {
  it("masks tokens, keys and activation codes by key name", () => {
    const out = maskSensitive({
      access_token: "abc123",
      apiKey: "k-999",
      "X-Api-Key": "k-1",
      activation_code: "ACT-42",
      matchingId: "M-1",
      smdp_address: "smdp.example",
      data: [{ lpa: "LPA:1$smdp$CODE" }],
      plan: "Turkey 5GB",
    }) as Record<string, unknown>;
    expect(out["access_token"]).toBe("***");
    expect(out["apiKey"]).toBe("***");
    expect(out["X-Api-Key"]).toBe("***");
    expect(out["activation_code"]).toBe("***");
    expect(out["matchingId"]).toBe("***");
    expect(out["smdp_address"]).toBe("***");
    expect(out["data"]).toEqual([{ lpa: "***" }]);
    expect(out["plan"]).toBe("Turkey 5GB");
  });

  it("masks secrets hidden inside free-text values", () => {
    const out = maskSensitive({ message: "use LPA:1$rsp.example.com$K2-ABC and Bearer eyJabc.def.ghi with sk_live_1234567890abcd" });
    expect(out).toEqual({ message: "use *** and *** with ***" });
  });
});
