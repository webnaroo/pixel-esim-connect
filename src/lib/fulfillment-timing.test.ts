import { describe, it, expect } from "vitest";
import { inProgressDelaySeconds, MAX_IN_PROGRESS_ATTEMPTS } from "./fulfillment";

describe("Fallback-Polling bei eSIMerge 'läuft noch'", () => {
  it("erste Abfrage nach 60 Sekunden", () => expect(inProgressDelaySeconds(1)).toBe(60));
  it("danach alle 30 Sekunden bis 5 Minuten", () => {
    let t = 0;
    for (let a = 1; a <= 9; a++) t += inProgressDelaySeconds(a);
    expect(inProgressDelaySeconds(2)).toBe(30);
    expect(t).toBe(300);
  });
  it("nach 5 Minuten alle 2 Minuten", () => expect(inProgressDelaySeconds(10)).toBe(120));
  it("hört nicht nach 4 Versuchen auf", () => expect(MAX_IN_PROGRESS_ATTEMPTS).toBeGreaterThan(9));
});
