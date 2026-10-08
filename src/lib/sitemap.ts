/** Read complete public lists; a failed page must never produce partial sitemap XML. */
export async function readAllPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await read(from, from + pageSize - 1);
    if (result.error || !result.data) throw new Error("Sitemap source unavailable");
    rows.push(...result.data);
    if (result.data.length < pageSize) return rows;
  }
}

export function sitemapXml(urls: string[]) {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map((url) => `  <url><loc>${escape(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
}