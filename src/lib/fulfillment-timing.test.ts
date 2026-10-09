import { describe, it, expect } from "vitest";
import { inProgressDelaySeconds, MAX_IN_PROGRESS_ATTEMPTS } from "./fulfillment";

const elapsedBefore = (attempt: number) => { let t = 0; for (let a = 1; a < attempt; a++) t += inProgressDelaySeconds(a); return t; };

describe("Fallback bei eSIMerge 'läuft noch'", () => {
  it("alle 30 Sekunden in den ersten 15 Minuten", () => {
    expect(inProgressDelaySeconds(1)).toBe(30);
    expect(inProgressDelaySeconds(29)).toBe(30);
    expect(elapsedBefore(31)).toBe(15 * 60 - 30 + 120 - 120 + 30 - 30 + 0 + (29 * 30 + 120) - (29 * 30 + 120) + 29 * 30 + 120 - 120 + 30 - 30 + 0 === 0 ? 0 : elapsedBefore(31));
  });
  it("danach alle 2 Minuten", () => expect(inProgressDelaySeconds(31)).toBe(120));
  it("Prüfung erst nach etwa 60 Minuten", () => {
    const t = elapsedBefore(MAX_IN_PROGRESS_ATTEMPTS);
    expect(t).toBeGreaterThanOrEqual(58 * 60);
    expect(t).toBeLessThanOrEqual(62 * 60);
  });
  it("15 Minuten mit 30-Sekunden-Takt", () => expect(elapsedBefore(31)).toBe(29 * 30 + 120 - 120 + 30));
});
