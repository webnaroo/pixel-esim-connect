import { parseHTML } from "linkedom";
import { SITE_URL, pageUrl } from "./seo";

export type SeoPageCheck = { path: string; status: number; canonical: string | null; types: string[]; errors: string[]; warnings: string[] };
export const PUBLIC_UTILITY_PATHS = ["/blog", "/login", "/register", "/reset-password"];

export function auditPaths(xml: string): string[] {
  const { document } = parseHTML(xml);
  const paths = [...document.querySelectorAll("loc")].map((node) => {
    const url = new URL(node.textContent ?? "");
    if (url.origin !== SITE_URL || url.search || url.hash) throw new Error("Ungültige Sitemap-URL: " + url.href);
    return url.pathname;
  });
  if (!paths.includes("/")) throw new Error("Sitemap enthält keine Startseite.");
  return [...new Set([...paths, ...PUBLIC_UTILITY_PATHS])];
}

export function auditSeoHtml(path: string, html: string, status = 200): SeoPageCheck {
  const { document } = parseHTML(html);
  const errors: string[] = [], warnings: string[] = [], types: string[] = [];
  const links = [...document.querySelectorAll('link[rel="canonical"]')];
  const canonical = links[0]?.getAttribute("href") ?? null;
  const noindex = [...document.querySelectorAll('meta[name="robots"]')].some((m) => /noindex/i.test(m.getAttribute("content") ?? ""));
  if (status !== 200) errors.push(`HTTP ${status}`);
  if (links.length > 1) errors.push("Mehr als eine kanonische URL.");
  if (!noindex && !canonical) errors.push("Kanonische URL fehlt.");
  if (canonical && canonical !== pageUrl(path)) errors.push(`Kanonische URL falsch: ${canonical}; erwartet ${pageUrl(path)}`);
  if (noindex) warnings.push("Von der Indexierung ausgeschlossen.");
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  if (!noindex && !scripts.length) errors.push("Strukturierte Daten fehlen.");
  const ids = new Set<string>();
  const visit = (value: unknown, root = false) => {
    if (Array.isArray(value)) { value.forEach((v) => visit(v, root)); return; }
    if (!value || typeof value !== "object") { if (root) errors.push("JSON-LD muss ein Objekt sein."); return; }
    const node = value as Record<string, unknown>;
    if (root && node["@context"] !== "https://schema.org") errors.push("JSON-LD: schema.org-Kontext fehlt oder ist falsch.");
    if (root && !node["@type"] && !node["@graph"]) errors.push("JSON-LD: @type fehlt.");
    if (node["@type"]) types.push(...(Array.isArray(node["@type"]) ? node["@type"].map(String) : [String(node["@type"])]));
    if (typeof node["@id"] === "string" && node["@type"]) {
      if (ids.has(node["@id"])) errors.push(`Doppelte Schema-ID: ${node["@id"]}`);
      ids.add(node["@id"]);
    }
    for (const key of ["url", "@id", "item"]) {
      if (typeof node[key] === "string" && /^https?:\/\//.test(node[key])) {
        const u = new URL(node[key]);
        if (/lovable\.app$|localhost|127\.0\.0\.1/.test(u.hostname)) errors.push(`Vorschau-URL im Schema: ${node[key]}`);
        if (u.hostname.endsWith("globesim.de") && u.origin !== SITE_URL) errors.push(`Falscher öffentlicher Ursprung: ${node[key]}`);
      }
    }
    if (node["@type"] === "Product") {
      if (node.url !== pageUrl(path)) errors.push("Product-URL entspricht nicht der Seite.");
      const offers = node.offers as Record<string, unknown> | undefined;
      if (!offers || offers.priceCurrency !== "EUR" || !(Number(offers.lowPrice ?? offers.price) > 0)) errors.push("Product: gültiges EUR-Angebot fehlt.");
    }
    if (node["@type"] === "BlogPosting" && node.mainEntityOfPage !== pageUrl(path)) errors.push("BlogPosting-Seitenbezug ist falsch.");
    if (node["@type"] === "BreadcrumbList") {
      const items = node.itemListElement;
      if (!Array.isArray(items) || !items.length || items.some((item, i) => item.position !== i + 1 || !item.name || !item.item)) errors.push("BreadcrumbList: ungültige Einträge oder Reihenfolge.");
    }
    Object.entries(node).forEach(([key, v]) => { if (key !== "@context" && v && typeof v === "object") visit(v); });
  };
  scripts.forEach((script, i) => {
    try { visit(JSON.parse(script.textContent ?? ""), true); }
    catch { errors.push(`JSON-LD ${i + 1} ist ungültiges JSON.`); }
  });
  if (/^\/(countries|regions)\//.test(path) && !noindex && !types.includes("Product")) errors.push("Product-Schema fehlt auf der Tarifseite.");
  if (/^\/blog\/.+/.test(path) && !noindex && !types.includes("BlogPosting")) errors.push("BlogPosting-Schema fehlt.");
  return { path, status, canonical, types: [...new Set(types)], errors: [...new Set(errors)], warnings };
}

export async function auditPublicPages(origin: string, read: typeof fetch = fetch): Promise<SeoPageCheck[]> {
  const sitemap = await read(`${origin}/sitemap.xml`, { redirect: "error" });
  if (!sitemap.ok) throw new Error(`Sitemap nicht verfügbar (HTTP ${sitemap.status}). Keine vollständige Prüfung möglich.`);
  const paths = auditPaths(await sitemap.text());
  const results: SeoPageCheck[] = [];
  // Bounded concurrency, but no truncated inventory: every sitemap page is checked.
  for (let i = 0; i < paths.length; i += 4) {
    results.push(...await Promise.all(paths.slice(i, i + 4).map(async (path) => {
      try {
        const response = await read(`${origin}${path}`, { redirect: "manual" });
        return auditSeoHtml(path, await response.text(), response.status);
      } catch {
        return { path, status: 0, canonical: null, types: [], errors: ["Seite nicht erreichbar."], warnings: [] };
      }
    })));
  }
  return results;
}