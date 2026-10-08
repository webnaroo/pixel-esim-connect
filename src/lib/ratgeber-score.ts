// Rule-based quality score (SEO / GEO / trust). No AI judgement. Quality score, not a ranking prediction.
import { allText, articleJsonLd, faqJsonLd, schemaValid, wordCount, type FaqItem, type InternalLink, type Section, type Source } from "./ratgeber";

export type CheckState = "ok" | "partial" | "missing";
export type Check = { id: string; group: "seo" | "geo" | "trust"; label: string; state: CheckState; tip: string; penalty?: number };
export type QualityReport = { total: number; seo: number; geo: number; trust: number; checks: Check[] };

export const DEFAULT_WORDLIST = ["beste", "bester", "bestes", "Nr. 1", "Nummer 1", "garantiert", "günstigste", "günstigster", "100 % Netzabdeckung", "Saily", "Holafly", "Airalo", "Roamic", "Yesim"];

export type ScoreInput = {
  title: string; slug: string; focus_keyword?: string | null; meta_title?: string | null; meta_description?: string | null;
  answer_summary?: string | null; body_md?: string | null; sections: Section[]; faq: FaqItem[]; sources: Source[]; internal_links: InternalLink[];
  cover_url?: string | null; cover_image_alt?: string | null; author_name?: string | null;
  target_words: number; published_at?: string | null; updated_at?: string | null;
};

const has = (hay: string | null | undefined, needle: string) => !!hay && hay.toLowerCase().includes(needle.toLowerCase());
const tri = (okCount: number, total: number, partialFrom = 1): CheckState => (okCount >= total ? "ok" : okCount >= partialFrom ? "partial" : "missing");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function forbiddenWords(text: string, list: string[]) {
  return list.filter((w) => w.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w.trim())}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text));
}
export const hasFixedPrice = (text: string) => /(\d+(?:[.,]\d{1,2})?\s?(?:€|EUR\b|Euro\b))|(€\s?\d)/i.test(text);
export function countInternalLinks(text: string, links: InternalLink[]) {
  return (text.match(/\]\(\/[a-z0-9/-]*\)/gi) ?? []).length + links.length;
}
export function firstParagraph(p: ScoreInput) {
  const src = p.answer_summary?.trim() || p.body_md?.trim() || p.sections[0]?.body_md || "";
  return src.split(/\n{2,}/)[0] ?? "";
}

export function computeScore(p: ScoreInput, wordlist: string[] = DEFAULT_WORDLIST, now = new Date()): QualityReport {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);
  const text = allText(p);
  const body = [p.body_md, ...p.sections.map((s) => s.body_md)].join("\n\n");

  /* ---- SEO ---- */
  const kw = p.focus_keyword?.trim();
  if (!kw) add({ id: "keyword", group: "seo", label: "Fokus-Suchbegriff platziert", state: "missing", tip: "Fokus-Suchbegriff festlegen." });
  else {
    const spots = [has(p.title, kw), has(p.meta_title, kw), has(p.meta_description, kw), has(firstParagraph(p), kw), p.sections.some((s) => s.level === "h2" && has(s.heading, kw))];
    add({ id: "keyword", group: "seo", label: "Fokus-Suchbegriff platziert", state: tri(spots.filter(Boolean).length, 5, 3), tip: `„${kw}“ in H1, Meta-Title, Meta-Description, erstem Absatz und einer H2 verwenden.` });
  }
  const mt = (p.meta_title ?? "").length, md = (p.meta_description ?? "").length;
  add({ id: "meta", group: "seo", label: "Meta-Title ≤ 60, Meta-Description 120–155 Zeichen", state: tri([mt > 0 && mt <= 60, md >= 120 && md <= 155].filter(Boolean).length, 2), tip: `Meta-Title ${mt}/60, Meta-Description ${md} (Ziel 120–155).` });
  const extraH1 = (body.match(/^#\s/gm) ?? []).length;
  const firstIsH2 = p.sections[0]?.level !== "h3";
  const h2Count = p.sections.filter((s) => s.level === "h2").length;
  add({ id: "headings", group: "seo", label: "Genau eine H1, sinnvolle H2/H3-Hierarchie", state: tri([!!p.title.trim() && extraH1 === 0, firstIsH2 && h2Count >= 2].filter(Boolean).length, 2), tip: "Nur der Titel ist H1; mit H2 beginnen, H3 nur unter einer H2, mindestens 2 H2." });
  const slugWords = p.slug.split("-").length;
  add({ id: "slug", group: "seo", label: "Slug kurz und sprechend", state: p.slug.length <= 60 && slugWords <= 6 ? "ok" : p.slug.length <= 90 ? "partial" : "missing", tip: "Slug höchstens 60 Zeichen und 6 Wörter." });
  const words = wordCount(text);
  const dev = Math.abs(words - p.target_words) / p.target_words;
  add({ id: "words", group: "seo", label: "Wortzahl passend zum Typ", state: dev <= 0.25 ? "ok" : dev <= 0.5 ? "partial" : "missing", tip: `${words} Wörter, Ziel ca. ${p.target_words}.` });
  const links = countInternalLinks(body, p.internal_links);
  const coverOk = !!p.cover_url && !!p.cover_image_alt?.trim();
  add({ id: "links_cover", group: "seo", label: "Mind. 2 interne Links, Titelbild mit Alt-Text", state: tri([links >= 2, coverOk].filter(Boolean).length, 2), tip: `${links} interne Links; ${coverOk ? "Bild mit Alt-Text vorhanden" : "Titelbild mit Alt-Text fehlt"}.` });
  const plain = body.replace(/\|.*\|/g, " ").replace(/^\s*(\d+\.|[-*])\s+/gm, "");
  const sentences = plain.split(/[.!?]+\s/).map((s) => wordCount(s)).filter((n) => n > 0);
  const avg = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  const longPara = plain.split(/\n{2,}/).some((b) => wordCount(b) > 120);
  add({ id: "readability", group: "seo", label: "Lesbarkeit (Satz- und Absatzlänge)", state: tri([avg > 0 && avg <= 20, !longPara].filter(Boolean).length, 2), tip: `Ø ${avg.toFixed(1)} Wörter pro Satz (Ziel ≤ 20); Absätze höchstens 120 Wörter.` });

  /* ---- GEO ---- */
  const sw = wordCount(p.answer_summary);
  add({ id: "summary", group: "geo", label: "Kurzantwort 40–60 Wörter unter der H1", state: sw >= 40 && sw <= 60 ? "ok" : sw >= 30 && sw <= 80 ? "partial" : "missing", tip: `Kurzantwort hat ${sw} Wörter.` });
  const q = p.sections.filter((s) => s.heading.trim().endsWith("?")).length;
  add({ id: "questions", group: "geo", label: "Zwischenüberschriften als Fragen", state: p.sections.length && q / p.sections.length >= 0.5 ? "ok" : q > 0 ? "partial" : "missing", tip: `${q} von ${p.sections.length} Überschriften sind Fragen (Ziel ≥ 50 %).` });
  const tableOrSteps = /^\|.*\|$/m.test(body) || /^1\.\s+/m.test(body);
  add({ id: "structure", group: "geo", label: "Tabelle oder nummerierte Schritte", state: tableOrSteps ? "ok" : "missing", tip: "Eine Tabelle oder nummerierte Schrittfolge einfügen." });
  const faqCountOk = p.faq.length >= 4 && p.faq.length <= 6;
  const faqLenOk = p.faq.length > 0 && p.faq.every((f) => { const n = wordCount(f.a); return n >= 40 && n <= 60; });
  add({ id: "faq", group: "geo", label: "FAQ mit 4–6 Einträgen, Antworten 40–60 Wörter", state: faqCountOk && faqLenOk ? "ok" : faqCountOk || faqLenOk ? "partial" : "missing", tip: `${p.faq.length} FAQ-Einträge; jede Antwort 40–60 Wörter.` });
  const a = articleJsonLd({ title: p.title, description: p.meta_description || p.answer_summary || "", author: p.author_name || "", publishedAt: p.published_at || p.updated_at || now.toISOString(), updatedAt: p.updated_at || now.toISOString() }, `/ratgeber/${p.slug}`);
  const sv = schemaValid(a, faqJsonLd(p.faq));
  add({ id: "schema", group: "geo", label: "Article- und FAQPage-Schema valide", state: tri([sv.articleOk, sv.faqOk].filter(Boolean).length, 2), tip: "Beschreibung, Autor und FAQ ausfüllen, damit beide Schemas vollständig sind." });
  add({ id: "author", group: "geo", label: "Autor und Datum sichtbar", state: p.author_name?.trim() ? "ok" : "missing", tip: "Autor eintragen; Veröffentlichungs- und Aktualisierungsdatum zeigt die Seite automatisch." });
  const srcOk = p.sources.filter((s) => s.url && s.accessed_at).length;
  add({ id: "sources", group: "geo", label: "Quellen mit URL und Abrufdatum", state: srcOk >= 1 ? "ok" : "missing", tip: "Mindestens eine Quelle mit URL und Abrufdatum eintragen." });

  /* ---- Trust (penalties) ---- */
  const bad = forbiddenWords(text, wordlist);
  add({ id: "words_forbidden", group: "trust", label: "Keine Superlative oder Wettbewerber-Namen", state: bad.length ? "missing" : "ok", penalty: 30, tip: bad.length ? `Gefunden: ${bad.join(", ")}.` : "Keine Treffer aus der Wortliste." });
  const price = hasFixedPrice(text);
  add({ id: "prices", group: "trust", label: "Keine festen Preise im Text", state: price ? "missing" : "ok", penalty: 30, tip: "Preise nur über {{LIVE_PREISE:XX}} einbinden." });
  const ref = p.updated_at ? new Date(p.updated_at) : now;
  const old = (now.getTime() - ref.getTime()) / 86_400_000 > 180;
  add({ id: "fresh", group: "trust", label: "Aktualität (≤ 180 Tage)", state: old ? "missing" : "ok", penalty: 10, tip: old ? "Beitrag ist älter als 180 Tage – Inhalte prüfen und aktualisieren." : "Aktuell." });

  const pts = (c: Check) => (c.state === "ok" ? 1 : c.state === "partial" ? 0.5 : 0);
  const avgOf = (g: "seo" | "geo") => { const cs = checks.filter((c) => c.group === g); return Math.round((cs.reduce((s, c) => s + pts(c), 0) / cs.length) * 100); };
  const seo = avgOf("seo"), geo = avgOf("geo");
  const trust = Math.max(0, 100 - checks.filter((c) => c.group === "trust" && c.state !== "ok").reduce((s, c) => s + (c.penalty ?? 0), 0));
  return { total: Math.round((seo + geo + trust) / 3), seo, geo, trust, checks };
}

export const scoreTone = (n: number) => (n >= 80 ? "green" : n >= 60 ? "yellow" : "red");
