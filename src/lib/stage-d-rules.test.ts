import { describe, expect, it } from "vitest";
import { fillLegal, parseCompanyInfo } from "./legal";
import { checkFaqText, fillFaq, isCompatFaq } from "./faq-rules";
import { anonymizeOrderPatch, isDeleteConfirmed } from "./anonymize";
import { canSendCustomerEmail, parseEmailSettings } from "./email-rules";

describe("legal placeholders", () => {
  it("never invents company data: missing fields are marked", () => {
    const r = fillLegal("{company_name}, {city}", parseCompanyInfo({ city: "Berlin" }));
    expect(r.text).toBe("[fehlt: Firmenname], Berlin");
    expect(r.missing).toEqual(["Firmenname"]);
  });
});

describe("FAQ rules", () => {
  it("rejects fixed prices", () => expect(checkFaqText("Ab 4,99 € pro Paket")).toHaveLength(1));
  it("rejects hardcoded no-throttle claims", () => expect(checkFaqText("Unlimited ohne Drosselung")).toHaveLength(1));
  it("rejects fixed coverage numbers", () => expect(checkFaqText("In 190 Ländern")).toHaveLength(1));
  it("accepts placeholders", () => expect(checkFaqText("Ab {min_price} in {destination_count} Reisezielen, {unlimited_claim}")).toEqual([]));
  it("hides the entry when a DB value is missing", () => expect(fillFaq("Ab {min_price}", { minPrice: null, destinationCount: 7, unlimitedClaim: null })).toBeNull());
  it("fills DB values", () => expect(fillFaq("{destination_count} Ziele", { minPrice: null, destinationCount: 7, unlimitedClaim: null })).toBe("7 Ziele"));
  it("shows the device check only at the compatibility question", () => {
    expect(isCompatFaq("Ist mein Smartphone eSIM-fähig?")).toBe(true);
    expect(isCompatFaq("Funktioniert die eSIM auf meinem Gerät?")).toBe(true);
    expect(isCompatFaq("Was ist eine eSIM?")).toBe(false);
    expect(isCompatFaq("Kann ich eine eSIM zurückgeben?")).toBe(false);
    expect(isCompatFaq("Wann sollte ich die eSIM installieren?")).toBe(false);
  });
});

describe("account deletion", () => {
  it("keeps the order but removes the person", () => {
    const p = anonymizeOrderPatch("12345678-aaaa-bbbb-cccc-000000000000", new Date("2026-10-08T00:00:00Z"));
    expect(p.user_id).toBeNull();
    expect(p.guest_email).toBe("geloescht-12345678@anonym.invalid");
  });
  it("requires typing LÖSCHEN", () => {
    expect(isDeleteConfirmed("löschen")).toBe(false);
    expect(isDeleteConfirmed("LÖSCHEN")).toBe(true);
  });
});

describe("email sending", () => {
  it("does not send without a verified domain", () => {
    expect(canSendCustomerEmail(parseEmailSettings({ sender_domain: "globesim.de", verified: false }))).toBe(false);
    expect(canSendCustomerEmail(parseEmailSettings({ sender_domain: "", verified: true }))).toBe(false);
    expect(canSendCustomerEmail(parseEmailSettings({ sender_domain: "globesim.de", verified: true }))).toBe(true);
  });
});
