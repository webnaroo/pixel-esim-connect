import { describe, expect, it } from "vitest";
import { articleJsonLd, faqJsonLd, planBlockState, publishBlockers } from "./ratgeber";

const base = { title: "eSIM Türkei", sections: [{ heading: "Abschnitt", body_md: "Text" }], faq: [] };

describe("ratgeber rules", () => {
  it("live price block shows plans when tariffs exist", () => {
    expect(planBlockState([{ price: 9.9 }])).toBe("plans");
  });
  it("live price block says preparing without tariffs or with test data", () => {
    expect(planBlockState([])).toBe("preparing");
    expect(planBlockState([{ price: 9.9 }], true)).toBe("preparing");
  });
  it("open [PRÜFEN] placeholder blocks publishing", () => {
    expect(publishBlockers({ ...base, sections: [{ heading: "Regeln", body_md: "[PRÜFEN: Quelle]" }] })).toHaveLength(1);
    expect(publishBlockers(base)).toEqual([]);
  });
  it("meta title over 60 and description over 155 chars block publishing", () => {
    expect(publishBlockers({ ...base, meta_title: "x".repeat(61), meta_description: "y".repeat(156) })).toHaveLength(2);
  });
  it("superlatives block publishing", () => {
    expect(publishBlockers({ ...base, answer_summary: "Die beste eSIM mit 100 % Netzabdeckung" })).toHaveLength(1);
  });
  it("article and FAQ schema are valid schema.org objects", () => {
    const a = articleJsonLd({ title: "T", description: "D", author: "GlobeSIM", publishedAt: "2026-10-01", updatedAt: "2026-10-02" }, "/ratgeber/esim-tuerkei");
    expect(a["@type"]).toBe("Article");
    expect(a.dateModified).toBe("2026-10-02");
    expect(a.mainEntityOfPage).toBe("https://globesim.de/ratgeber/esim-tuerkei");
    const f = faqJsonLd([{ q: "Frage?", a: "Antwort." }]);
    expect(f?.mainEntity[0]?.acceptedAnswer.text).toBe("Antwort.");
    expect(faqJsonLd([])).toBeNull();
  });
});
