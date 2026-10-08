import { describe, expect, it } from "vitest";
import { decideNewRate, effectiveRate, fetchQuotes, invertEurRate, parseEcbXml, shouldReprice, type FxRow } from "./fx";

const now = new Date("2026-10-08T18:00:00Z");
const row = (o: Partial<FxRow>): FxRow => ({ from_currency: "USD", to_currency: "EUR", rate: 0.9, source: "ecb", status: "active", published_at: "2026-10-08", fetched_at: "2026-10-08T16:30:00Z", expires_at: null, ...o });

describe("conversion", () => {
  it("turns ECB EUR→USD into USD→EUR (1 / rate)", () => expect(invertEurRate(1.25)).toBe(0.8));
  it("parses the ECB file", () => {
    const q = parseEcbXml("<Cube><Cube time='2026-10-08'><Cube currency='USD' rate='1.1186'/></Cube></Cube>");
    expect(q).toEqual({ date: "2026-10-08", eurTo: { USD: 1.1186 } });
  });
});

describe("buffer", () => {
  it("applies the safety buffer", () => expect(effectiveRate([row({ rate: 0.9 })], "USD", now, 2)?.usedRate).toBeCloseTo(0.918, 6));
});

describe("plausibility", () => {
  it("holds a rate more than 5 % off for review", () => expect(decideNewRate(row({ rate: 0.9 }), 0.96)).toBe("review"));
  it("accepts a normal move", () => expect(decideNewRate(row({ rate: 0.9 }), 0.92)).toBe("accept"));
});

describe("age", () => {
  it("no rate older than 7 days → no price", () => expect(effectiveRate([row({ published_at: "2026-09-30", fetched_at: "2026-09-30T16:30:00Z" })], "USD", now, 2)).toBeNull());
  it("missing rate → no price", () => expect(effectiveRate([], "USD", now, 2)).toBeNull());
  it("pending review rates are not used", () => expect(effectiveRate([row({ status: "pending_review" })], "USD", now, 2)).toBeNull());
});

describe("manual override", () => {
  const manual = row({ source: "manual", rate: 0.95, published_at: null, fetched_at: "2026-10-08T10:00:00Z", expires_at: "2026-10-10T00:00:00Z" });
  it("overrides the automatic rate", () => expect(effectiveRate([row({}), manual], "USD", now, 0)?.sourceRate).toBe(0.95));
  it("expires", () => expect(effectiveRate([row({}), manual], "USD", new Date("2026-10-10T01:00:00Z"), 0)?.sourceRate).toBe(0.9));
});

describe("repricing", () => {
  it("ignores changes below 0.5 %", () => expect(shouldReprice(10, 10.04)).toBe(false));
  it("reprices above 0.5 %", () => expect(shouldReprice(10, 10.06)).toBe(true));
});

describe("sources", () => {
  const q = { date: "2026-10-08", eurTo: { USD: 1.1 } };
  it("uses the fallback when ECB fails", async () => expect(await fetchQuotes(async () => { throw new Error("down"); }, async () => q)).toEqual({ quotes: q, source: "fallback" }));
  it("keeps the last rate and warns when both fail", async () => {
    const r = await fetchQuotes(async () => null, async () => null);
    expect(r.quotes).toBeNull();
    expect("warning" in r && r.warning).toContain("letzte gültige Kurs");
  });
});
