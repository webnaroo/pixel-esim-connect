// Eigener Text pro Reiseziel, ausschließlich aus echten Katalogdaten und redaktionellen Orten (destination-highlights.ts).
// Keine Aussagen zu Netzqualität, Abdeckung oder Geschwindigkeit ohne Quelle; Netze nennen wir nur, wenn der Anbieter sie liefert.
import { formatData, formatDays, formatPrice } from "./format";
import { HIGHLIGHTS } from "./destination-highlights";

export type SeoPlan = {
  type: "data" | "unlimited";
  dataMb: number | null;
  validityDays: number;
  price: number;
  networks: string[] | null;
  networkType: string | null;
  hotspot: boolean | null;
  topUpable: boolean | null;
};

export type PlanStats = {
  count: number;
  fromPrice: number;
  maxPrice: number;
  gbOptions: number[];
  minGb: number | null;
  maxGb: number | null;
  days: number[];
  minDays: number;
  maxDays: number;
  unlimitedCount: number;
  networks: string[];
  hotspotAll: boolean;
  topUpAll: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function planStats(plans: SeoPlan[]): PlanStats | null {
  const priced = plans.filter((p) => Number.isFinite(p.price) && p.price > 0);
  if (!priced.length) return null;
  const gb = [...new Set(priced.filter((p) => p.type === "data" && p.dataMb && p.dataMb >= 1024).map((p) => round1(p.dataMb! / 1024)))].sort((a, b) => a - b);
  const days = [...new Set(priced.map((p) => p.validityDays))].sort((a, b) => a - b);
  const networks = [...new Set(priced.flatMap((p) => p.networks ?? []).map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  return {
    count: priced.length,
    fromPrice: Math.min(...priced.map((p) => p.price)),
    maxPrice: Math.max(...priced.map((p) => p.price)),
    gbOptions: gb,
    minGb: gb.length ? gb[0]! : null,
    maxGb: gb.length ? gb[gb.length - 1]! : null,
    days,
    minDays: days[0]!,
    maxDays: days[days.length - 1]!,
    unlimitedCount: priced.filter((p) => p.type === "unlimited").length,
    networks,
    hotspotAll: priced.every((p) => p.hotspot === true),
    topUpAll: priced.every((p) => p.topUpable === true),
  };
}

/** Stabile Auswahl je Reiseziel, damit Formulierungen zwischen Seiten abwechseln. */
export function pick<T>(seed: string, options: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length]!;
}

const gbText = (n: number) => `${Number.isInteger(n) ? n : String(n).replace(".", ",")} GB`;

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

/** Dativ nach "bis zu", "von … bis …": 1 Tag, 7 Tagen. */
export const daysDat = (n: number) => `${n} ${n === 1 ? "Tag" : "Tagen"}`;

export function dayRange(s: PlanStats): string {
  return s.minDays === s.maxDays ? formatDays(s.minDays) : `${s.minDays} bis ${daysDat(s.maxDays)}`;
}

export type SeoSection = { heading: string; paragraphs: string[]; list?: string[] };
export type SeoFaq = { q: string; a: string };

/** Ein repräsentativer Tarif für Kurzreisen: günstigster Tarif mit mindestens 1 GB und höchstens 10 Tagen Laufzeit. */
function shortTripPlan(plans: SeoPlan[]) {
  return plans
    .filter((p) => p.type === "data" && p.dataMb && p.dataMb >= 1024 && p.validityDays <= 10 && p.price > 0)
    .sort((a, b) => a.price - b.price || (b.dataMb ?? 0) - (a.dataMb ?? 0))[0] ?? null;
}

export function metaDescription(name: string, s: PlanStats): string {
  const size = s.minGb != null && s.maxGb != null ? (s.minGb === s.maxGb ? ` (${gbText(s.minGb)})` : ` (${s.minGb} bis ${gbText(s.maxGb)})`) : "";
  const text = `eSIM ${name} ab ${formatPrice(s.fromPrice)}: ${s.count} Tarife${size}, ${dayRange(s)} Laufzeit. Online kaufen, per QR-Code installieren, statt teurem Roaming. Preise inkl. MwSt.`;
  return text.length > 158 ? `${text.slice(0, 155).replace(/[ ,.;:]+\S*$/, "")}…` : text;
}

export function metaTitle(name: string, s: PlanStats): string {
  return `eSIM ${name} kaufen – ab ${formatPrice(s.fromPrice)} | GlobeSIM`;
}

export function buildCountrySeo(input: { slug: string; name: string; plans: SeoPlan[] }): { sections: SeoSection[]; faq: SeoFaq[] } | null {
  const { slug, name, plans } = input;
  const s = planStats(plans);
  if (!s) return null;
  const hl = HIGHLIGHTS[slug];
  const sections: SeoSection[] = [];

  // Länderartikel (die Türkei, die USA) vermeiden wir bewusst: Wir schreiben "eSIM {Name}" statt "eSIM für/in {Name}".
  const intro = pick(slug, [
    `Reiseziel ${name}: Mit einer eSIM bist du am Ziel online, ohne die SIM-Karte zu wechseln. Aktuell findest du bei GlobeSIM ${s.count} Tarife ab ${formatPrice(s.fromPrice)}.`,
    `Mit der Reise-eSIM ${name} nutzt du mobile Daten zum festen Preis. Zur Wahl stehen ${s.count} Tarife, der günstigste kostet ${formatPrice(s.fromPrice)}.`,
    `Mobiles Internet ${name} ohne Umweg über den Shop vor Ort: Du kaufst die eSIM online, installierst sie per QR-Code und schaltest sie am Reiseziel ein. Es gibt ${s.count} Tarife ab ${formatPrice(s.fromPrice)}.`,
  ]);
  const range: string[] = [];
  if (s.minGb != null && s.maxGb != null) range.push(s.minGb === s.maxGb ? `Datenvolumen: ${gbText(s.minGb)}` : `Datenvolumen von ${gbText(s.minGb)} bis ${gbText(s.maxGb)}`);
  range.push(s.minDays === s.maxDays ? `Laufzeit: ${formatDays(s.minDays)}` : `Laufzeiten von ${s.minDays} bis ${daysDat(s.maxDays)}`);
  if (s.maxPrice > s.fromPrice) range.push(`Preise von ${formatPrice(s.fromPrice)} bis ${formatPrice(s.maxPrice)} inkl. MwSt`);
  sections.push({
    heading: `eSIM ${name}: Tarife, Preise und Laufzeiten`,
    paragraphs: [intro, `${range.join(". ")}.${s.unlimitedCount ? ` Zusätzlich gibt es ${s.unlimitedCount} Unlimited-${s.unlimitedCount === 1 ? "Tarif" : "Tarife"} mit eigenen Fair-Use-Regeln, die du beim jeweiligen Tarif siehst.` : ""}`],
  });

  const trip = shortTripPlan(plans);
  const sizing: string[] = [`Datenvolumen ${name}: Wie viel du brauchst, hängt davon ab, wie du dein Handy nutzt. Für Messenger, Karten und gelegentliche Fotos reicht meist ein kleiner Tarif, bei Videos, Streaming und Hotspot-Nutzung solltest du mehr einplanen.`];
  if (trip) sizing.push(`Für eine Kurzreise passt zum Beispiel ${formatData(trip.dataMb)} für ${formatDays(trip.validityDays)} zum Preis von ${formatPrice(trip.price)}.`);
  if (s.maxDays >= 15) sizing.push(`Bleibst du länger, findest du Tarife mit bis zu ${daysDat(s.maxDays)} Laufzeit.`);
  sections.push({ heading: `Wie viel Datenvolumen brauchst du? eSIM ${name}`, paragraphs: sizing });

  if (hl) {
    const places = joinList(hl.places);
    sections.push({
      heading: `Reiseziele ${name}: ${hl.places.slice(0, 3).join(", ")} und mehr`,
      paragraphs: [
        pick(slug + "p", [
          `${places}: Eine eSIM hilft dir bei Karten, Taxi-Apps, Übersetzer und Tickets, sobald du angekommen bist.`,
          `Viele Reisende nutzen unterwegs Navigation, Messenger und Buchungs-Apps, ob in ${places}. Mit der eSIM sind die Daten dafür gleich bei der Ankunft bereit.`,
          `Wohin auch immer dich die Reise führt, zum Beispiel nach ${places}: Du kannst die eSIM schon zu Hause einrichten und am Ziel einschalten.`,
        ]),
        ...(hl.season ? [hl.season] : []),
      ],
    });
  }

  const adv: string[] = [
    `Die Reise-eSIM ${name} ist ein Prepaid-Datentarif. Du zahlst einmal, es gibt keinen Vertrag und keine Verlängerung. So weißt du schon vor der Reise, was mobiles Internet kostet, statt dich auf die Roaming-Preise deines Mobilfunkanbieters zu verlassen.`,
  ];
  if (s.networks.length) adv.push(`Netz${s.networks.length > 1 ? "e" : ""} laut Anbieter: ${joinList(s.networks)}.`);
  if (s.hotspotAll) adv.push("Hotspot (Internet teilen) ist bei diesen Tarifen möglich.");
  if (s.topUpAll) adv.push("Du kannst bei diesen Tarifen nachbuchen.");
  sections.push({ heading: `Reise-eSIM ${name} statt Roaming`, paragraphs: adv });

  sections.push({
    heading: `eSIM ${name} einrichten: so geht es`,
    paragraphs: [`Die Einrichtung dauert nur wenige Minuten und funktioniert auf Smartphones, die eSIM unterstützen und keinen SIM-Lock haben.`],
    list: [
      `Tarif wählen und online bezahlen.`,
      "Installationsdaten per E-Mail und im Konto erhalten.",
      "QR-Code scannen oder die Daten manuell eingeben.",
      `Am Reiseziel die eSIM für mobile Daten auswählen und Datenroaming für diese eSIM einschalten.`,
    ],
  });

  const faq: SeoFaq[] = [
    { q: `Was kostet eine eSIM ${name}?`, a: `Die eSIM ${name} gibt es bei GlobeSIM ab ${formatPrice(s.fromPrice)}. Der Preis hängt von Datenvolumen und Laufzeit ab, alle Preise verstehen sich inkl. MwSt.` },
    { q: `Wie lange ist die eSIM ${name} gültig?`, a: s.minDays === s.maxDays ? `Die Tarife gelten ${formatDays(s.minDays)}.` : `Je nach Tarif zwischen ${s.minDays} und ${daysDat(s.maxDays)}.` },
    { q: "Kann ich meine normale SIM-Karte behalten?", a: "Ja. Die eSIM wird zusätzlich eingerichtet. Deine normale SIM bleibt für Anrufe und SMS aktiv." },
    { q: "Welche Handys unterstützen eine eSIM?", a: "Viele aktuelle iPhones, Pixel- und Samsung-Modelle. Prüfe dein Gerät in unserer Geräteliste vor dem Kauf." },
  ];
  return { sections, faq };
}

export function buildRegionSeo(input: { slug: string; name: string; plans: SeoPlan[]; countryNames: string[] }): { sections: SeoSection[]; faq: SeoFaq[] } | null {
  const { slug, name, plans, countryNames } = input;
  const s = planStats(plans);
  if (!s) return null;
  const sample = countryNames.slice(0, 8);
  const sections: SeoSection[] = [
    {
      heading: `eSIM ${name}: ein Tarif für mehrere Länder`,
      paragraphs: [
        pick(slug, [
          `Mit der Regions-eSIM ${name} nutzt du einen Tarif in mehreren Ländern, ohne unterwegs neue SIM-Karten zu kaufen. Aktuell gibt es ${s.count} Tarife ab ${formatPrice(s.fromPrice)}.`,
          `Du reist durch mehrere Länder? Die eSIM ${name} deckt die enthaltenen Länder mit einem Tarif ab. Zur Auswahl stehen ${s.count} Tarife ab ${formatPrice(s.fromPrice)}.`,
        ]),
        ...(countryNames.length ? [`Enthalten sind ${countryNames.length} Länder${sample.length ? `, zum Beispiel ${joinList(sample)}` : ""}. Die vollständige Länderliste siehst du auf dieser Seite.`] : []),
      ],
    },
    {
      heading: `Länder-eSIM oder Regions-eSIM ${name}?`,
      paragraphs: [`Besuchst du nur ein Land, ist ein Tarif für dieses Land oft günstiger. Reist du durch mehrere Länder der Region, sparst du mit der Regions-eSIM das Wechseln zwischen mehreren Tarifen.`],
    },
  ];
  const faq: SeoFaq[] = [
    { q: `Was kostet die eSIM ${name}?`, a: `Die Tarife starten bei ${formatPrice(s.fromPrice)} inkl. MwSt. Der Preis hängt von Datenvolumen und Laufzeit ab.` },
    { q: "Muss ich in jedem Land eine neue eSIM kaufen?", a: "Nein. Die Regions-eSIM gilt in den enthaltenen Ländern. Welche das sind, siehst du in der Länderliste auf dieser Seite." },
  ];
  return { sections, faq };
}
