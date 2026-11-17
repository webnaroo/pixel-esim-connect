import { SITE_URL } from "@/content/site-url";
import { site } from "@/content/site";

interface SeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object[];
}

/** Einheitliche Metadaten je Seite: Titel, Beschreibung, Canonical, Open Graph, strukturierte Daten. */
export function seo({ title, description, path, image = "/og/boxzentrum-kiel.jpg", noindex, jsonLd = [] }: SeoInput) {
  const url = `${SITE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
  const fullTitle = path === "/" ? title : `${title} | ${site.name}`;
  const img = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:image", content: img },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ],
    links: noindex ? [] : [{ rel: "canonical", href: url }],
    scripts: jsonLd.map((data) => ({ type: "application/ld+json", children: JSON.stringify(data) })),
  };
}

export const breadcrumb = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});
