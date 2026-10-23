import { describe, expect, it } from "vitest";
import { buildOfflineSnapshot, isOfflineEligible, OFFLINE_MAX_ESIMS, parseOfflineSnapshot, type OfflineEsim } from "./offline-esims";

const e = (n: number, over: Partial<OfflineEsim> = {}): OfflineEsim => ({ orderId: `o${n}`, title: "Ägypten", lpa: "LPA:1$x$y", smdp: "x", activationCode: "y", validityDays: 7, activatedAt: null, qrSvg: "<svg/>", ...over });

describe("Offline-eSIMs", () => {
  it("speichert nur gelieferte, nutzbare eSIMs", () => {
    expect(isOfflineEligible({ status: "ready" }, "fulfilled")).toBe(true);
    expect(isOfflineEligible({ status: "active" }, "fulfilled")).toBe(true);
    expect(isOfflineEligible({ status: "expired" }, "fulfilled")).toBe(false);
    expect(isOfflineEligible({ status: "cancelled" }, "fulfilled")).toBe(false);
    expect(isOfflineEligible({ status: "ready" }, "refunded")).toBe(false);
    expect(isOfflineEligible({ status: "ready" }, undefined)).toBe(false);
  });
  it("lässt Einträge ohne LPA oder QR weg und begrenzt die Anzahl", () => {
    const many = Array.from({ length: OFFLINE_MAX_ESIMS + 5 }, (_, i) => e(i));
    expect(buildOfflineSnapshot([e(1, { lpa: "" }), e(2, { qrSvg: "" })], new Date(0)).esims).toHaveLength(0);
    expect(buildOfflineSnapshot(many, new Date(0)).esims).toHaveLength(OFFLINE_MAX_ESIMS);
  });
  it("liest nur gültige Kopien zurück", () => {
    const snap = buildOfflineSnapshot([e(1)], new Date("2026-10-23T12:00:00Z"));
    expect(parseOfflineSnapshot(JSON.stringify(snap))?.esims[0]?.title).toBe("Ägypten");
    expect(parseOfflineSnapshot("kaputt")).toBeNull();
    expect(parseOfflineSnapshot(JSON.stringify({ v: 2, esims: [], savedAt: "x" }))).toBeNull();
    expect(parseOfflineSnapshot(null)).toBeNull();
  });
});
