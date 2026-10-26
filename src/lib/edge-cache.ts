// Kurzer Cloudflare-Cache für öffentliche Seiten, die für alle Besucher gleich aussehen. Reine Regeln, ohne I/O.
// Frisch: 60 s. Danach bis zu 5 weitere Minuten wird die alte Seite ausgeliefert, während im Hintergrund neu geladen wird.
export const FRESH_SECONDS = 60;
export const STALE_SECONDS = 300;

const STATIC_PATHS = new Set(["/", "/destinations", "/how-it-works", "/faq", "/help", "/device-compatibility", "/ratgeber"]);
const PREFIXES = ["/countries/", "/regions/", "/legal/", "/ratgeber/"];
/** Tracking-Parameter ändern die Seite nicht und gehören nicht in den Cache-Schlüssel. */
const TRACKING = /^(utm_[a-z]+|fbclid|ttclid|gclid|msclkid|igshid|_ga|_gl)$/i;

export function isCacheablePath(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (STATIC_PATHS.has(p)) return true;
  return PREFIXES.some((pre) => p.startsWith(pre) && p.length > pre.length && !p.slice(pre.length).includes("/"));
}

/** Schlüssel ohne Tracking-Parameter. Null, wenn die Adresse nicht zwischengespeichert werden soll (andere Parameter ändern oft die Seite, z. B. /help?subject=…). */
export function cacheKeyFor(url: URL): string | null {
  if (!isCacheablePath(url.pathname)) return null;
  for (const k of url.searchParams.keys()) if (!TRACKING.test(k)) return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return `${url.origin}${path}`;
}

export function canServeFromCache(req: { method: string; hasAuthorization: boolean }): boolean {
  return req.method === "GET" && !req.hasAuthorization;
}

/** Nur erfolgreiche HTML-Seiten ohne Cookies und ohne no-store werden gespeichert. */
export function isStorable(res: { status: number; contentType: string | null; hasSetCookie: boolean; cacheControl: string | null }): boolean {
  if (res.status !== 200 || res.hasSetCookie) return false;
  if (!(res.contentType ?? "").toLowerCase().includes("text/html")) return false;
  return !/no-store|private/i.test(res.cacheControl ?? "");
}

export type Freshness = "fresh" | "stale" | "expired";
export function freshness(ageSeconds: number): Freshness {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return "expired";
  if (ageSeconds < FRESH_SECONDS) return "fresh";
  return ageSeconds < FRESH_SECONDS + STALE_SECONDS ? "stale" : "expired";
}
