import Fuse from "fuse.js";

export type SearchDestination = {
  id: string;
  type: "country" | "region" | "global";
  slug: string;
  name: string;
  aliases: string[];
  flagCode: string | null;
  fromPrice: number | null;
};

/** Lowercase, fold umlauts to their two-letter form and strip remaining diacritics. */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Also index the umlaut-less spelling ("turkei") next to the folded one ("tuerkei"). */
function variants(s: string): string[] {
  const folded = normalizeSearch(s);
  const plain = normalizeSearch(
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
  return folded === plain ? [folded] : [folded, plain];
}

type Indexed = SearchDestination & { terms: string[] };

export function createSearchIndex(items: SearchDestination[]) {
  const indexed: Indexed[] = items.map((d) => ({
    ...d,
    terms: [...new Set([d.name, ...d.aliases].flatMap(variants))],
  }));
  const fuse = new Fuse(indexed, {
    keys: ["terms"],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return function search(query: string, limit = 8): SearchDestination[] {
    const q = normalizeSearch(query);
    if (!q) return [];
    const prefix = indexed.filter((d) =>
      d.terms.some((t) => t.startsWith(q) || t.split(" ").some((w) => w.startsWith(q))),
    );
    // Exact term hits first (e.g. "us" -> USA), then prefix, then fuzzy.
    prefix.sort((a, b) => {
      const ea = a.terms.includes(q) ? 0 : 1;
      const eb = b.terms.includes(q) ? 0 : 1;
      return ea - eb || a.name.localeCompare(b.name, "de");
    });
    const seen = new Set(prefix.map((d) => d.id));
    const fuzzy = q.length >= 3 ? fuse.search(q).map((r) => r.item).filter((d) => !seen.has(d.id)) : [];
    return [...prefix, ...fuzzy].slice(0, limit).map(({ terms: _t, ...d }) => d);
  };
}
