export const SITE_URL = "https://globesim.de";

export function privateHead(title: string, description: string) {
  return { meta: [
    { title: `${title} | GlobeSIM` }, { name: "description", content: description },
    { property: "og:title", content: `${title} | GlobeSIM` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] };
}

export function pageUrl(path: string) {
  return `${SITE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
}

export function pageIdentity(path: string) {
  const url = pageUrl(path);
  return {
    meta: [{ property: "og:url", content: url }],
    links: [{ rel: "canonical", href: url }],
  };
}

export function textExcerpt(markdown: string, limit = 155) {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~]/g, "")
    .replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit - 1);
  return `${clipped.slice(0, clipped.lastIndexOf(" ") > 0 ? clipped.lastIndexOf(" ") : clipped.length)}…`;
}

export function breadcrumbScript(items: { name: string; path: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: pageUrl(item.path) })),
    }),
  };
}

export function productScript(d: { name: string; plans: { price: number }[]; fixturePlans?: boolean }, path: string) {
  const prices = d.plans.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  if (d.fixturePlans || !prices.length) return [];
  return [{
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org", "@type": "Product",
      "@id": `${pageUrl(path)}#product`, url: pageUrl(path), name: `eSIM für ${d.name}`,
      brand: { "@type": "Brand", name: "GlobeSIM" },
      offers: { "@type": "AggregateOffer", url: pageUrl(path), priceCurrency: "EUR", lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: prices.length },
    }),
  }];
}
export type CompanyProfile = { company_name?: string | undefined; street?: string | undefined; zip?: string | undefined; city?: string | undefined; country?: string | undefined; email?: string | undefined; vat_id?: string | undefined };

const DE = new Set(["deutschland", "germany", "de"]);

/** Organization-Markup. Firmendaten kommen aus app_settings.company_info (nie hier eingetippt); fehlende Felder fehlen im Markup. */
export function organizationJsonLd(company: CompanyProfile | null | undefined) {
  const c = company ?? {};
  const address = c.street || c.zip || c.city || c.country
    ? {
        "@type": "PostalAddress",
        ...(c.street ? { streetAddress: c.street } : {}),
        ...(c.zip ? { postalCode: c.zip } : {}),
        ...(c.city ? { addressLocality: c.city } : {}),
        ...(c.country ? { addressCountry: DE.has(c.country.toLowerCase()) ? "DE" : c.country } : {}),
      }
    : null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "GlobeSIM",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/globesim-logo.png`,
    description: "Reise-eSIM für mobiles Internet im Ausland",
    ...(c.company_name && c.company_name !== "GlobeSIM" ? { legalName: c.company_name } : {}),
    ...(c.email ? { email: c.email, contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: c.email, availableLanguage: "de" } } : {}),
    ...(address ? { address } : {}),
    ...(c.vat_id ? { vatID: c.vat_id } : {}),
  };
}

export const OG_IMAGE = `${SITE_URL}/og-globesim-1200x630.png`;
