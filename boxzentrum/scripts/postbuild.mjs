// Nach dem Build: saubere Sitemap, 404.html für statische Hosts, Hilfsdateien entfernen.
import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist/client");
const SITE_URL = process.env.SITE_URL ?? "https://boxzentrum-kiel.de";
const EXCLUDE = new Set(["/impressum", "/datenschutz"]);

async function walk(dir, base = "") {
  const pages = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (["assets", "img", "og"].includes(entry.name)) continue;
      pages.push(...(await walk(path.join(dir, entry.name), `${base}/${entry.name}`)));
    } else if (entry.name === "index.html") {
      pages.push(base || "/");
    }
  }
  return pages;
}

const pages = (await walk(out)).filter((p) => !EXCLUDE.has(p)).sort();
const today = new Date().toISOString().slice(0, 10);
const priority = (p) => (p === "/" ? "1.0" : p === "/probetraining" || p === "/training" || p === "/trainingsplan" ? "0.9" : p.startsWith("/training/") ? "0.7" : "0.8");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${today}</lastmod><priority>${priority(p)}</priority></url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(out, "sitemap.xml"), xml);
// 404.html mit dem echten „nicht gefunden“-Zustand des Routers rendern, damit die Hydrierung auf jeder unbekannten Adresse passt
const { default: server } = await import(path.join(root, "dist/server/server.js"));
const notFound = await server.fetch(new Request("http://localhost/__nicht-gefunden"));
if (notFound.status !== 404) throw new Error(`404-Seite: unerwarteter Status ${notFound.status}`);
await writeFile(path.join(out, "404.html"), await notFound.text());
await rm(path.join(out, "pages.json"), { force: true });
const robots = (await readFile(path.join(out, "robots.txt"), "utf8")).replace(/Sitemap: .*/, `Sitemap: ${SITE_URL}/sitemap.xml`);
await writeFile(path.join(out, "robots.txt"), robots);
console.log(`[postbuild] sitemap.xml mit ${pages.length} Seiten, 404.html erstellt`);
