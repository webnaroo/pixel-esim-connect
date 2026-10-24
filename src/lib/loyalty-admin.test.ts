import { describe, expect, it } from "vitest";
import { adjustInputSchema, deductionAllowed, exactIlikePattern } from "./loyalty-admin";

const ok = { email: "Kunde@Example.com ", amount: 5, reason: "Kulanz nach Verzögerung" };

describe("GlobeMoney Buchung: Eingabe", () => {
  it("nimmt gültige Eingaben und normalisiert die E-Mail", () => {
    const r = adjustInputSchema.parse(ok);
    expect(r.email).toBe("kunde@example.com");
  });
  it("zählt Gutschriften standardmäßig für die Stufe", () => {
    expect(adjustInputSchema.parse(ok).countsForTier).toBe(true);
    expect(adjustInputSchema.parse({ ...ok, countsForTier: false }).countsForTier).toBe(false);
  });
  it("lehnt 0, zu große Beträge und halbe Cent ab", () => {
    expect(adjustInputSchema.safeParse({ ...ok, amount: 0 }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, amount: 500.01 }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, amount: -501 }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, amount: 1.005 }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, amount: 500 }).success).toBe(true);
    expect(adjustInputSchema.safeParse({ ...ok, amount: -2.5 }).success).toBe(true);
  });
  it("verlangt eine gültige E-Mail und einen Grund", () => {
    expect(adjustInputSchema.safeParse({ ...ok, email: "kein-email" }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, reason: "  " }).success).toBe(false);
    expect(adjustInputSchema.safeParse({ ...ok, reason: "x".repeat(201) }).success).toBe(false);
  });
});

describe("GlobeMoney Buchung: Regeln", () => {
  it("Abziehen höchstens bis zum Kontostand", () => {
    expect(deductionAllowed(500, -5)).toBe(true);
    expect(deductionAllowed(500, -5.01)).toBe(false);
    expect(deductionAllowed(0, -0.01)).toBe(false);
    expect(deductionAllowed(0, 3)).toBe(true);
  });
  it("macht aus Unterstrich und Prozent normale Zeichen", () => {
    expect(exactIlikePattern("a_b%c@x.de")).toBe("a\\_b\\%c@x.de");
    expect(exactIlikePattern("plain@x.de")).toBe("plain@x.de");
  });
});
