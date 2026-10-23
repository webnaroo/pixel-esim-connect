import { describe, expect, it } from "vitest";
import { expiryAlertDue, planEndsAt } from "./esim-expiry";

const base = { activatedAt: "2026-10-16T12:00:00Z", validityDays: 7, alreadySent: false };

describe("Ablauf-Mitteilung", () => {
  it("Tarifende = Aktivierung + Laufzeit", () => {
    expect(planEndsAt("2026-10-16T12:00:00Z", 7)?.toISOString()).toBe("2026-10-23T12:00:00.000Z");
    expect(planEndsAt(null, 7)).toBeNull();
    expect(planEndsAt("2026-10-16T12:00:00Z", null)).toBeNull();
    expect(planEndsAt("kein datum", 7)).toBeNull();
  });
  it("fällig ab 48 Stunden vor Ende, vorher nicht", () => {
    expect(expiryAlertDue({ ...base, now: new Date("2026-10-21T11:00:00Z") }).due).toBe(false);
    expect(expiryAlertDue({ ...base, now: new Date("2026-10-21T13:00:00Z") })).toEqual({ due: true, daysLeft: 2 });
    expect(expiryAlertDue({ ...base, now: new Date("2026-10-22T20:00:00Z") })).toEqual({ due: true, daysLeft: 1 });
  });
  it("nicht mehr nach Ablauf und nicht doppelt", () => {
    expect(expiryAlertDue({ ...base, now: new Date("2026-10-23T12:00:01Z") }).due).toBe(false);
    expect(expiryAlertDue({ ...base, alreadySent: true, now: new Date("2026-10-22T12:00:00Z") }).due).toBe(false);
  });
  it("ohne Aktivierung keine Mitteilung", () => {
    expect(expiryAlertDue({ ...base, activatedAt: null, now: new Date("2026-10-22T12:00:00Z") }).due).toBe(false);
  });
});
