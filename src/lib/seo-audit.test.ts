import { describe, expect, it } from "vitest";
import { auditPublicPages, auditSeoHtml, auditPaths } from "./seo-audit";
import { normalizeAnalysis, seoReportInput } from "./seo-analysis";

const html = (canonical: string, schema: string) => `<html><head><link rel="canonical" href="${canonical}"><script type="application/ld+json">${schema}</script></head></html>`;
const organization = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", url: "https://globesim.de/" });
describe("public canonical and structured data validation", () => {
  it("reports incorrect canonical URLs", () => {
    expect(auditSeoHtml("/faq", html("https://preview.lovable.app/faq", organization)).errors).toEqual(["Kanonische URL falsch: https://preview.lovable.app/faq; erwartet https://globesim.de/faq"]);
  });
  it("reports malformed structured data", () => {
    expect(auditSeoHtml("/", html("https://globesim.de/", "{bad}")).errors).toContain("JSON-LD 1 ist ungültiges JSON.");
  });
  it("reports missing Product schema on public destination pages", () => {
    expect(auditSeoHtml("/countries/turkey", html("https://globesim.de/countries/turkey", organization)).errors).toContain("Product-Schema fehlt auf der Tarifseite.");
  });
  it("rejects foreign sitemap destinations", () => {
    expect(() => auditPaths("<urlset><url><loc>https://evil.example/</loc></url></urlset>")).toThrow("Ungültige Sitemap-URL");
  });
  it("checks the complete inventory and reports errors per page", async () => {
    const visited: string[] = [];
    const read = async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname; visited.push(path);
      if (path === "/sitemap.xml") return new Response("<urlset><url><loc>https://globesim.de/</loc></url><url><loc>https://globesim.de/faq</loc></url></urlset>");
      return new Response(html("https://globesim.de" + path, path === "/faq" ? "broken" : organization));
    };
    const result = await auditPublicPages("https://globesim.de", read);
    expect(result).toHaveLength(6);
    expect(visited).toContain("/reset-password");
    expect(result.find((r) => r.path === "/faq")?.errors).toContain("JSON-LD 1 ist ungültiges JSON.");
  });
  it("does not silently accept an unavailable inventory", async () => {
    await expect(auditPublicPages("https://globesim.de", async () => new Response("", { status: 503 }))).rejects.toThrow("Keine vollständige Prüfung möglich");
  });
  it("orders recommendations and never retains foreign affected URLs", () => {
    const r = { title: "CTR", evidence: "Bericht", action: "Prüfen", impact: "Relevanz", effort: "klein" as const, verification: "CTR vergleichen" };
    expect(normalizeAnalysis({ summary: "", limitations: [], recommendations: [{ ...r, priority: "P3", page: "https://evil.example/" }, { ...r, priority: "P1", page: "/faq" }] }).recommendations.map((v) => [v.priority, v.page])).toEqual([["P1", "/faq"], ["P3", ""]]);
  });
  it("rejects overlong report inputs before billing an AI call", () => {
    expect(seoReportInput.safeParse({ title: "GSC", report: "x".repeat(40001) }).success).toBe(false);
  });
});

// Live regression: every public sitemap URL, including database-driven pages.
it("audits canonical URLs and structured data on all current public pages", async () => {
  const results = await auditPublicPages(process.env.SEO_TEST_ORIGIN ?? "http://localhost:8080");
  const failures = results.filter((page) => page.errors.length).map((page) => ({ page: page.path, errors: page.errors }));
  expect(results.length).toBeGreaterThan(4);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
}, 120000);