import { describe, expect, it } from "vitest";
import { cacheKeyFor, canServeFromCache, freshness, isCacheablePath, isStorable } from "./edge-cache";

const key = (u: string) => cacheKeyFor(new URL(u));

describe("edge cache rules", () => {
  it("caches only public pages", () => {
    for (const p of ["/", "/destinations", "/faq", "/how-it-works", "/countries/turkey", "/regions/europe", "/legal/agb", "/ratgeber", "/ratgeber/esim-tuerkei"]) expect(isCacheablePath(p)).toBe(true);
    for (const p of ["/account", "/admin", "/admin/orders", "/checkout/abc", "/order/123", "/install/1", "/api/public/cron/x", "/login", "/cart", "/countries/", "/countries/a/b", "/sitemap.xml", "/llms.txt"]) expect(isCacheablePath(p)).toBe(false);
  });
  it("ignores tracking parameters and trailing slashes, but not other parameters", () => {
    expect(key("https://globesim.de/countries/turkey?utm_source=meta&fbclid=x")).toBe("https://globesim.de/countries/turkey");
    expect(key("https://globesim.de/faq/")).toBe("https://globesim.de/faq");
    expect(key("https://globesim.de/help?subject=Frage")).toBeNull();
    expect(key("https://globesim.de/account")).toBeNull();
  });
  it("serves only anonymous GET requests", () => {
    expect(canServeFromCache({ method: "GET", hasAuthorization: false })).toBe(true);
    expect(canServeFromCache({ method: "POST", hasAuthorization: false })).toBe(false);
    expect(canServeFromCache({ method: "GET", hasAuthorization: true })).toBe(false);
  });
  it("stores only successful html without cookies", () => {
    const ok = { status: 200, contentType: "text/html; charset=utf-8", hasSetCookie: false, cacheControl: null };
    expect(isStorable(ok)).toBe(true);
    expect(isStorable({ ...ok, status: 404 })).toBe(false);
    expect(isStorable({ ...ok, status: 500 })).toBe(false);
    expect(isStorable({ ...ok, hasSetCookie: true })).toBe(false);
    expect(isStorable({ ...ok, contentType: "application/json" })).toBe(false);
    expect(isStorable({ ...ok, cacheControl: "no-store" })).toBe(false);
  });
  it("classifies freshness", () => {
    expect(freshness(10)).toBe("fresh");
    expect(freshness(60)).toBe("stale");
    expect(freshness(359)).toBe("stale");
    expect(freshness(360)).toBe("expired");
    expect(freshness(-1)).toBe("expired");
  });
});
