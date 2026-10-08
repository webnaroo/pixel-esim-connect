import { describe, expect, it } from "vitest";
import { pageUrl, productScript } from "./seo";
import { readAllPages, sitemapXml } from "./sitemap";

describe("public SEO data boundaries", () => {
  it("uses globesim.de for page identities", () => {
    expect(pageUrl("/countries/turkey")).toBe("https://globesim.de/countries/turkey");
    expect(pageUrl("/blog/")).toBe("https://globesim.de/blog");
  });
  it("never emits product offers for preview fixtures", () => {
    expect(productScript({ name: "Türkei", plans: [{ price: 8.99 }], fixturePlans: true }, "/countries/turkey")).toEqual([]);
  });
  it("emits one product and only real positive prices", () => {
    const scripts = productScript({ name: "Türkei", plans: [{ price: 8.99 }, { price: 0 }, { price: NaN }] }, "/countries/turkey");
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]?.children ?? "{}").offers).toMatchObject({ lowPrice: "8.99", highPrice: "8.99", offerCount: 1 });
  });
  it("reads all public result pages", async () => {
    const source = [1, 2, 3, 4, 5];
    expect(await readAllPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }), 2)).toEqual(source);
  });
  it("rejects incomplete sitemap reads", async () => {
    await expect(readAllPages(async (from) => from === 0 ? { data: [1, 2], error: null } : { data: null, error: "unavailable" }, 2)).rejects.toThrow("Sitemap source unavailable");
  });
  it("deduplicates URLs without manufactured last modification dates", () => {
    const xml = sitemapXml([pageUrl("/"), pageUrl("/")]);
    expect(xml.match(/<loc>/g)).toHaveLength(1);
    expect(xml).not.toContain("lastmod");
  });
});