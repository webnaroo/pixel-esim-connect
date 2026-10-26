import { describe, expect, it } from "vitest";
import { llmsTxt } from "./llms-txt";
import { organizationJsonLd } from "./seo";

describe("llms.txt and organization markup", () => {
  it("uses company data only when present", () => {
    const t = llmsTxt({ email: "a@b.de", street: "Weg 1", zip: "24103", city: "Kiel", country: "Deutschland" }, 240);
    expect(t).toContain("E-Mail: a@b.de");
    expect(t).toContain("Anschrift: GlobeSIM, Weg 1, 24103 Kiel, Deutschland");
    expect(t).toContain("240 Reiseziele");
    const empty = llmsTxt(null, null);
    expect(empty).not.toContain("E-Mail:");
    expect(empty).not.toContain("Anschrift:");
    expect(empty).toContain("Impressum: https://globesim.de/legal/impressum");
  });
  it("builds a minimal organization without data and a full one with it", () => {
    const min = organizationJsonLd(null);
    expect(min["@type"]).toBe("Organization");
    expect(JSON.stringify(min)).not.toContain("address");
    const full = organizationJsonLd({ company_name: "X GmbH", street: "Weg 1", zip: "24103", city: "Kiel", country: "Deutschland", email: "a@b.de", vat_id: "DE1" }) as Record<string, unknown>;
    expect((full["address"] as { addressCountry: string }).addressCountry).toBe("DE");
    expect(full["email"]).toBe("a@b.de");
    expect(full["legalName"]).toBe("X GmbH");
  });
});
