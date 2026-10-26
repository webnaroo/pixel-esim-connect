// llms.txt: kurze Beschreibung des Angebots für Maschinen. Firmenangaben kommen aus company_info und fehlende Felder fehlen im Text.
import { SITE_URL, type CompanyProfile } from "./seo";

export function llmsTxt(company: CompanyProfile | null | undefined, destinationCount: number | null): string {
  const c = company ?? {};
  const lines: string[] = [
    "# GlobeSIM",
    "",
    "> GlobeSIM verkauft Reise-eSIMs für mobiles Internet im Ausland. Du wählst dein Reiseziel, zahlst online und installierst die eSIM per QR-Code. Deine normale SIM bleibt aktiv.",
    "",
    "## Angebot",
    destinationCount && destinationCount > 0 ? `- eSIM-Tarife für ${destinationCount} Reiseziele (Länder und Regionen)` : "- eSIM-Tarife für Länder und Regionen",
    "- Tarife nach Datenvolumen und Laufzeit, Preise inkl. MwSt.",
    "- Installationsdaten per E-Mail und im Kundenkonto",
    "- Bezahlung online über Stripe",
    "",
    "## Wichtige Seiten",
    `- Alle Reiseziele: ${SITE_URL}/destinations`,
    `- So funktioniert GlobeSIM: ${SITE_URL}/how-it-works`,
    `- Gerätekompatibilität: ${SITE_URL}/device-compatibility`,
    `- Häufige Fragen: ${SITE_URL}/faq`,
    `- Ratgeber: ${SITE_URL}/ratgeber`,
    `- Hilfe und Kontakt: ${SITE_URL}/help`,
    "",
    "## Kontakt",
  ];
  if (c.email) lines.push(`E-Mail: ${c.email}`);
  const place = [c.zip, c.city].filter(Boolean).join(" ");
  const addr = [c.company_name || "GlobeSIM", c.street, place || undefined, c.country].filter(Boolean).join(", ");
  if (c.street || place) lines.push(`Anschrift: ${addr}`);
  lines.push(`Impressum: ${SITE_URL}/legal/impressum`, "");
  return lines.join("\n");
}
