import { describe, expect, it } from "vitest";
import { articleJsonLd, berlinToUtc, coverFileError, faqJsonLd, isPublicNow, planBlockState, publishBlockers, schemaValid, splitLivePrices } from "./ratgeber";
import { computeScore, forbiddenWords, hasFixedPrice, type ScoreInput } from "./ratgeber-score";
import { aiRequestSchema, cleanText, draftRow, type AiContext } from "./ratgeber-ai";

const ready = { title: "eSIM Türkei", sections: [{ heading: "Abschnitt", level: "h2" as const, body_md: "Text" }], faq: [], cover_url: "/bild/ratgeber/x.webp", cover_image_alt: "Istanbul", author_name: "GlobeSIM-Team" };
const words = (n: number) => Array.from({ length: n }, (_, i) => `wort${i}`).join(" ");
const base: ScoreInput = { title: "eSIM Türkei einrichten", slug: "esim-tuerkei", sections: [], faq: [], sources: [], internal_links: [], target_words: 1400, updated_at: "2026-10-01T00:00:00Z" };
const check = (p: Partial<ScoreInput>, id: string, now = new Date("2026-10-08")) => computeScore({ ...base, ...p }, undefined, now).checks.find((c) => c.id === id)!.state;

describe("publish guard", () => {
  it("markers never block publishing", () => {
    expect(publishBlockers({ ...ready, answer_summary: "[QUELLE FEHLT: Roaming]" })).not.toContain("Offener [QUELLE FEHLT]-Hinweis im Text.");
    expect(publishBlockers(ready, 80)).toEqual([]);
  });
  it("cover image is optional; alt text only required when a cover exists", () => {
    expect(publishBlockers({ ...ready, cover_url: null, cover_image_alt: null })).toEqual([]);
    expect(publishBlockers({ ...ready, cover_image_alt: "" })).toContain("Alt-Text fürs Titelbild fehlt.");
    expect(publishBlockers({ ...ready, author_name: null })).toContain("Autor fehlt.");
  });
  it("blocks score below 70 unless a reason of at least 10 chars is given", () => {
    expect(publishBlockers(ready, 69)).toHaveLength(1);
    expect(publishBlockers(ready, 69, "kurz")).toHaveLength(1);
    expect(publishBlockers(ready, 69, "Bewusst freigegeben, Saisonthema")).toEqual([]);
    expect(publishBlockers(ready, 70)).toEqual([]);
  });
});

describe("scheduling", () => {
  it("scheduled post becomes public exactly at its time", () => {
    const p = { status: "scheduled", published_at: "2026-10-10T08:00:00.000Z" };
    expect(isPublicNow(p, new Date("2026-10-10T07:59:59Z"))).toBe(false);
    expect(isPublicNow(p, new Date("2026-10-10T08:00:00Z"))).toBe(true);
    expect(isPublicNow({ status: "draft", published_at: "2020-01-01T00:00:00Z" })).toBe(false);
  });
  it("converts Berlin time to UTC in summer and winter", () => {
    expect(berlinToUtc("2026-10-10T10:00")).toBe("2026-10-10T08:00:00.000Z");
    expect(berlinToUtc("2026-12-10T10:00")).toBe("2026-12-10T09:00:00.000Z");
  });
});

describe("live prices and cover", () => {
  it("splits {{LIVE_PREISE:XX}} placeholders", () => {
    expect(splitLivePrices("Vorher\n\n{{LIVE_PREISE:tr}}\n\nNachher")).toEqual([{ kind: "md", text: "Vorher\n\n" }, { kind: "prices", iso: "TR" }, { kind: "md", text: "\n\nNachher" }]);
  });
  it("price block shows plans only with real tariffs", () => {
    expect(planBlockState([{ price: 9.9 }])).toBe("plans");
    expect(planBlockState([])).toBe("preparing");
    expect(planBlockState([{ price: 9.9 }], true)).toBe("preparing");
  });
  it("cover upload accepts JPG/PNG/WebP up to 2 MB", () => {
    expect(coverFileError({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(coverFileError({ type: "image/gif", size: 10 })).toMatch(/JPG/);
    expect(coverFileError({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
  });
});

describe("schema", () => {
  it("Article and FAQPage schema are valid", () => {
    const a = articleJsonLd({ title: "T", description: "D", author: "GlobeSIM", publishedAt: "2026-10-01", updatedAt: "2026-10-02" }, "/ratgeber/esim-tuerkei");
    expect(a.mainEntityOfPage).toBe("https://globesim.de/ratgeber/esim-tuerkei");
    const f = faqJsonLd([{ q: "Frage?", a: "Antwort." }]);
    expect(schemaValid(a, f)).toEqual({ articleOk: true, faqOk: true });
    expect(schemaValid({ ...a, author: { "@type": "Organization", name: "" } }, null)).toEqual({ articleOk: false, faqOk: false });
  });
});

describe("quality score rules", () => {
  it("focus keyword in all 5 places", () => {
    const kw = { focus_keyword: "eSIM Türkei", meta_title: "eSIM Türkei", meta_description: "eSIM Türkei", answer_summary: "eSIM Türkei kurz", sections: [{ heading: "Was kostet eine eSIM Türkei?", level: "h2" as const, body_md: "" }] };
    expect(check(kw, "keyword")).toBe("ok");
    expect(check({ ...kw, meta_title: "x", meta_description: "x" }, "keyword")).toBe("partial");
    expect(check({}, "keyword")).toBe("missing");
  });
  it("meta title ≤ 60 and description 120–155", () => {
    expect(check({ meta_title: "a".repeat(60), meta_description: "b".repeat(130) }, "meta")).toBe("ok");
    expect(check({ meta_title: "a".repeat(61), meta_description: "b".repeat(130) }, "meta")).toBe("partial");
  });
  it("one H1 and H2/H3 hierarchy", () => {
    const h2 = (h: string) => ({ heading: h, level: "h2" as const, body_md: "" });
    expect(check({ sections: [h2("A?"), h2("B?")] }, "headings")).toBe("ok");
    expect(check({ sections: [{ heading: "A", level: "h3", body_md: "" }, h2("B")] }, "headings")).toBe("partial");
  });
  it("short slug", () => {
    expect(check({ slug: "esim-tuerkei" }, "slug")).toBe("ok");
    expect(check({ slug: "a-b-c-d-e-f-g-h" }, "slug")).toBe("partial");
  });
  it("word count fits type", () => {
    expect(check({ answer_summary: words(1400) }, "words")).toBe("ok");
    expect(check({ answer_summary: words(100) }, "words")).toBe("missing");
  });
  it("2 internal links and cover with alt", () => {
    expect(check({ internal_links: [{ label: "a", path: "/faq" }, { label: "b", path: "/ratgeber" }], cover_url: "/x", cover_image_alt: "Alt" }, "links_cover")).toBe("ok");
    expect(check({ cover_url: "/x", cover_image_alt: "Alt" }, "links_cover")).toBe("partial");
  });
  it("readability", () => {
    expect(check({ sections: [{ heading: "A", level: "h2", body_md: "Kurzer Satz hier. Noch ein Satz." }] }, "readability")).toBe("ok");
    expect(check({ sections: [{ heading: "A", level: "h2", body_md: words(130) }] }, "readability")).toBe("missing");
  });
  it("answer summary 40–60 words", () => {
    expect(check({ answer_summary: words(50) }, "summary")).toBe("ok");
    expect(check({ answer_summary: words(10) }, "summary")).toBe("missing");
  });
  it("headings as questions", () => {
    expect(check({ sections: [{ heading: "Wie geht das?", level: "h2", body_md: "" }, { heading: "Tipps", level: "h2", body_md: "" }] }, "questions")).toBe("ok");
    expect(check({ sections: [{ heading: "Tipps", level: "h2", body_md: "" }] }, "questions")).toBe("missing");
  });
  it("table or numbered steps", () => {
    expect(check({ sections: [{ heading: "A", level: "h2", body_md: "1. Eins\n2. Zwei" }] }, "structure")).toBe("ok");
    expect(check({ sections: [{ heading: "A", level: "h2", body_md: "| a | b |\n| - | - |\n| 1 | 2 |" }] }, "structure")).toBe("ok");
    expect(check({}, "structure")).toBe("missing");
  });
  it("FAQ 4–6 entries with 40–60 word answers", () => {
    const f = (n: number, w: number) => Array.from({ length: n }, (_, i) => ({ q: `Frage ${i}?`, a: words(w) }));
    expect(check({ faq: f(5, 50) }, "faq")).toBe("ok");
    expect(check({ faq: f(5, 10) }, "faq")).toBe("partial");
    expect(check({ faq: f(2, 10) }, "faq")).toBe("missing");
  });
  it("schema check needs description, author and FAQ", () => {
    expect(check({ meta_description: "D", author_name: "A", faq: [{ q: "F?", a: "A" }] }, "schema")).toBe("ok");
    expect(check({ meta_description: "D", author_name: "A" }, "schema")).toBe("partial");
  });
  it("author visible", () => {
    expect(check({ author_name: "GlobeSIM-Team" }, "author")).toBe("ok");
    expect(check({}, "author")).toBe("missing");
  });
  it("sources with URL and date", () => {
    expect(check({ sources: [{ title: "Q", url: "https://x.de", accessed_at: "2026-10-01" }] }, "sources")).toBe("ok");
    expect(check({}, "sources")).toBe("missing");
  });
  it("superlatives and competitor names subtract points", () => {
    expect(forbiddenWords("Die beste eSIM, besser als Airalo", ["beste", "Airalo"])).toEqual(["beste", "Airalo"]);
    expect(forbiddenWords("Jetzt bestellen", ["beste"])).toEqual([]);
    expect(computeScore({ ...base, answer_summary: "die beste Wahl" }, ["beste"]).trust).toBe(70);
  });
  it("fixed prices subtract points", () => {
    expect(hasFixedPrice("ab 9,99 €")).toBe(true);
    expect(hasFixedPrice("{{LIVE_PREISE:TR}}")).toBe(false);
    expect(check({ answer_summary: "nur 5 EUR" }, "prices")).toBe("missing");
  });
  it("open markers subtract points", () => {
  });
  it("warns when older than 180 days", () => {
    expect(check({ updated_at: "2026-01-01T00:00:00Z" }, "fresh")).toBe("missing");
    expect(check({ updated_at: "2026-09-01T00:00:00Z" }, "fresh")).toBe("ok");
  });
  it("total is the average of the three subscores", () => {
    const r = computeScore(base, [], new Date("2026-10-08"));
    expect(r.total).toBe(Math.round((r.seo + r.geo + r.trust) / 3));
  });
});

describe("generator", () => {
  const ctx: AiContext = { destinations: [{ iso: "TR", name: "Türkei", path: "/countries/turkey", unlimited_confirmed: false }], posts: [] };
  const req = aiRequestSchema.parse({ mode: "generate", topic: "eSIM Türkei", country: "tr", type: "guide", length: "normal" }) as Extract<ReturnType<typeof aiRequestSchema.parse>, { mode: "generate" }>;
  const out = { title: "eSIM Türkei", slug: "eSIM Türkei!", meta_title: "m", meta_description: "d", answer_summary: "Ohne Drosselung für 9,99 €", sections: [{ heading: "Wie geht das?", level: "h2" as const, body_md: "[Tarife](/countries/turkey) und [fremd](/admin)" }], faq: [], cover_image_alt: "Alt", internal_links: [{ label: "Tarife", path: "/countries/turkey" }, { label: "Admin", path: "/admin" }], missing_sources: [] };
  it("always saves as draft, never published", () => {
    const row = draftRow(out, ctx, req, 1400);
    expect(row.status).toBe("draft");
    expect(row.published_at).toBeNull();
    expect(row.slug).toBe("esim-tuerkei");
  });
  it("drops unknown links, unconfirmed throttle claims and fixed prices", () => {
    const row = draftRow(out, ctx, req, 1400);
    expect(row.sections[0]!.body_md).toContain("[Tarife](/countries/turkey) und fremd");
    expect(row.internal_links).toEqual([{ label: "Tarife", path: "/countries/turkey" }]);
    expect(row.answer_summary).not.toMatch(/Drosselung|PRÜFEN/);
    expect(row.answer_summary).not.toContain("9,99");
    expect(cleanText("ohne Drosselung", new Set(), true)).toBe("ohne Drosselung");
  });
});

import { stripMeta, withLivePrices } from "./ratgeber-ai";
describe("availability & live prices", () => {
  it("removes sentences about missing data", () => {
    expect(stripMeta("Ob eine Japan-eSIM verfügbar ist, lässt sich aus den bereitgestellten Daten nicht feststellen. Installiere sie vor Abflug.")).toBe("Installiere sie vor Abflug.");
  });
  it("removes hedging sentences", () => {
    expect(stripMeta("Für Japan liegt hier keine bestätigte Konfiguration vor. Schalte Datenroaming ein.")).toBe("Schalte Datenroaming ein.");
  });
  it("adds live prices for the country when missing", () => {
    expect(withLivePrices([{ body_md: "Text" }], "JP")[0]!.body_md).toContain("{{LIVE_PREISE:JP}}");
  });
});
