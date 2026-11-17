// Minimaler statischer Server für dist/client – zum Prüfen des fertigen Builds.
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/client");
const port = Number(process.env.PORT ?? 4180);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".avif": "image/avif", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".json": "application/json" };

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, url);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
  } catch {
    try { await stat(file + "/index.html"); file = file + "/index.html"; } catch { file = null; }
  }
  try {
    if (!file || !file.startsWith(root)) throw new Error("404");
    const body = await readFile(file);
    const ext = path.extname(file);
    const compress = [".html", ".js", ".css", ".svg", ".xml", ".txt", ".json"].includes(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "");
    res.writeHead(200, {
      "content-type": types[ext] ?? "application/octet-stream",
      "cache-control": url.startsWith("/assets/") || url.startsWith("/img/") ? "public, max-age=31536000, immutable" : "no-cache",
      ...(compress ? { "content-encoding": "gzip" } : {}),
    });
    res.end(compress ? gzipSync(body) : body);
  } catch {
    res.writeHead(404, { "content-type": types[".html"] });
    res.end(await readFile(path.join(root, "404.html")).catch(() => "404"));
  }
}).listen(port, () => console.log(`BoxZentrum-Build läuft auf http://localhost:${port}`));
