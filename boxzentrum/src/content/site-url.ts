/** Öffentliche Adresse der Website – für Canonicals, Sitemap und strukturierte Daten. */
export const SITE_URL = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.["SITE_URL"] ?? "https://boxzentrum-kiel.de";
