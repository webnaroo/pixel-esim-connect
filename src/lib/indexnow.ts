// IndexNow: meldet neue oder geänderte Seiten an Bing, Yandex und weitere Suchmaschinen (nicht an Google).
// Der Schlüssel ist öffentlich gedacht: er liegt als Datei /<schlüssel>.txt auf der Domain und beweist die Inhaberschaft.
import { SITE_URL } from "./seo";

export const INDEXNOW_KEY = "61fcccd3a412778e48e6a0cb05c23abe";
// Reihenfolge der Annahmestellen. Alle teilen die Meldung mit den anderen Suchmaschinen; wenn eine ablehnt (z. B. 429), kommt die nächste.
export const INDEXNOW_ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow", "https://yandex.com/indexnow"] as const;
export const INDEXNOW_USER_AGENT = "GlobeSIM-IndexNow/1.0 (+https://globesim.de)";
export const INDEXNOW_MAX_URLS = 10_000;

export function indexNowKeyLocation() {
  return `${SITE_URL}/${INDEXNOW_KEY}.txt`;
}

/** Nur URLs der eigenen Domain, ohne Duplikate, höchstens 10.000 pro Meldung. */
export function ownUrls(urls: string[]): string[] {
  const host = new URL(SITE_URL).host;
  const seen = new Set<string>();
  for (const u of urls) {
    try {
      const p = new URL(u);
      if (p.protocol === "https:" && p.host === host) seen.add(p.toString());
    } catch { /* ungültige Adresse überspringen */ }
  }
  return [...seen].slice(0, INDEXNOW_MAX_URLS);
}

export function indexNowPayload(urls: string[]) {
  return { host: new URL(SITE_URL).host, key: INDEXNOW_KEY, keyLocation: indexNowKeyLocation(), urlList: ownUrls(urls) };
}

/** 200 und 202 gelten als angenommen (202: Schlüssel wird noch geprüft). */
export function indexNowAccepted(status: number) {
  return status === 200 || status === 202;
}
