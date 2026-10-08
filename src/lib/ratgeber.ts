// Pure rules for Ratgeber (guide) posts: structure, visibility, publish guard, live prices, cover checks, JSON-LD.
import { z } from "zod";
import { pageUrl } from "./seo";

export const sectionSchema = z.object({
  heading: z.string().trim().min(3).max(200),
  level: z.enum(["h2", "h3"]).default("h2"),
  body_md: z.string().max(20_000).default(""),
  block: z.enum(["plans", "compat"]).optional(),
});
export const faqItemSchema = z.object({ q: z.string().trim().min(3).max(300), a: z.string().trim().min(3).max(2000) });
export const sourceSchema = z.object({ title: z.string().trim().min(2).max(200), url: z.string().trim().url().startsWith("https://"), accessed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export const linkSchema = z.object({ label: z.string().trim().min(2).max(120), path: z.string().trim().regex(/^\/[a-z0-9/-]*$/).max(200) });
export type Section = z.infer<typeof sectionSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type InternalLink = z.infer<typeof linkSchema>;

export const POST_STATUSES = ["draft", "review", "scheduled", "published", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const STATUS_LABEL: Record<PostStatus, string> = { draft: "Entwurf", review: "Zur Prüfung", scheduled: "Geplant", published: "Veröffentlicht", archived: "Archiviert" };
export const POST_TYPES = { guide: "Ziel-Ratgeber", explainer: "Erklärartikel", howto: "Anleitung", comparison: "Vergleich Roaming vs. eSIM" } as const;
export type PostType = keyof typeof POST_TYPES;
export const LENGTHS = { short: 800, normal: 1400, long: 2000 } as const;

function arr<T>(schema: z.ZodType<T>, v: unknown): T[] {
  const r = z.array(schema).safeParse(v);
  return r.success ? r.data : [];
}
export const parseSections = (v: unknown) => arr(sectionSchema, v) as Section[];
export const parseFaq = (v: unknown) => arr(faqItemSchema, v);
export const parseSources = (v: unknown) => arr(sourceSchema, v);
export const parseLinks = (v: unknown) => arr(linkSchema, v);

/** Public visibility: published or scheduled, and the publish time has passed (mirrors RLS). */
export function isPublicNow(p: { status: string; published_at: string | null }, now = new Date()) {
  return (p.status === "published" || p.status === "scheduled") && !!p.published_at && new Date(p.published_at) <= now;
}

/** Converts "YYYY-MM-DDTHH:mm" in Europe/Berlin to a UTC ISO string (handles CET/CEST). */
export function berlinToUtc(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) throw new Error("Ungültiges Datum.");
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
    const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - t;
  };
  return new Date(guess - offset(guess - offset(guess))).toISOString();
}

export type PostDraft = {
  title: string; meta_title?: string | null; meta_description?: string | null; answer_summary?: string | null;
  sections: Section[]; faq: FaqItem[]; body_md?: string | null;
  author_name?: string | null; cover_url?: string | null; cover_image_alt?: string | null;
};

export function allText(p: PostDraft) {
  return [p.title, p.meta_title, p.meta_description, p.answer_summary, p.body_md, ...p.sections.flatMap((s) => [s.heading, s.body_md]), ...p.faq.flatMap((f) => [f.q, f.a])].filter(Boolean).join("\n");
}
export const openMarkers = (text: string) => ({ pruefen: (text.match(/\[PRÜFEN[^\]]*\]/gi) ?? []).length, quelle: (text.match(/\[QUELLE FEHLT[^\]]*\]/gi) ?? []).length });

/** Removes any leftover [PRÜFEN…]/[QUELLE FEHLT…] markers – the owner does not want them. */
export const stripMarkers = (text: string) => text.replace(/\s*\[(?:PRÜFEN|QUELLE FEHLT)[^\]]*\]/gi, "");

export const MIN_PUBLISH_SCORE = 70;

/** Everything that blocks publishing. Score below 70 can only be overridden with a reason (≥ 10 chars). */
export function publishBlockers(p: PostDraft, score?: number | null, overrideReason?: string | null): string[] {
  const out: string[] = [];
  if (p.meta_title && p.meta_title.length > 60) out.push("Meta-Title länger als 60 Zeichen.");
  if (p.meta_description && p.meta_description.length > 155) out.push("Meta-Description länger als 155 Zeichen.");
  if (!p.cover_url) out.push("Titelbild fehlt.");
  if (!p.cover_image_alt?.trim()) out.push("Alt-Text fürs Titelbild fehlt.");
  if (!p.author_name?.trim()) out.push("Autor fehlt.");
  if (score != null && score < MIN_PUBLISH_SCORE && (overrideReason?.trim().length ?? 0) < 10) out.push(`Qualitätswertung unter ${MIN_PUBLISH_SCORE} (übergehen nur mit Begründung).`);
  return out;
}

export function wordCount(s: string | null | undefined) {
  return (s ?? "").replace(/[#*|>`_-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/** Live price block state: never shows fixed prices from text. */
export function planBlockState(plans: { price: number }[] | null | undefined, fixture = false): "plans" | "preparing" {
  return plans && plans.length > 0 && !fixture ? "plans" : "preparing";
}

/** Splits Markdown at {{LIVE_PREISE:XX}} tokens; the page renders live tariffs in their place. */
export type LivePart = { kind: "md"; text: string } | { kind: "prices"; iso: string };
export function splitLivePrices(text: string): LivePart[] {
  const out: LivePart[] = [];
  const re = /\{\{LIVE_PREISE:([A-Za-z]{2})\}\}/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: "md", text: text.slice(last, m.index) });
    out.push({ kind: "prices", iso: m[1]!.toUpperCase() });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "md", text: text.slice(last) });
  return out.filter((p) => p.kind === "prices" || p.text.trim());
}
export const livePriceIsos = (text: string) => [...new Set(splitLivePrices(text).flatMap((p) => (p.kind === "prices" ? [p.iso] : [])))];

export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const COVER_MAX_BYTES = 2 * 1024 * 1024;
export function coverFileError(f: { type: string; size: number }): string | null {
  if (!(COVER_TYPES as readonly string[]).includes(f.type)) return "Nur JPG, PNG oder WebP erlaubt.";
  if (f.size > COVER_MAX_BYTES) return "Datei größer als 2 MB.";
  return null;
}
/** Covers are stored by random name and served from /bild/ratgeber/<name>.webp. */
export const isCoverPath = (s: string) => /^\/bild\/ratgeber\/[a-f0-9-]{36}\.webp$/.test(s);
export const coverAbsUrl = (s: string | null | undefined) => (!s ? null : s.startsWith("https://") ? s : isCoverPath(s) ? pageUrl(s) : null);

export function slugify(s: string) {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

export function articleJsonLd(p: { title: string; description: string; author: string; publishedAt: string; updatedAt: string; image?: string | null }, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    author: { "@type": "Organization", name: p.author },
    publisher: { "@type": "Organization", name: "GlobeSIM", url: pageUrl("/") },
    datePublished: p.publishedAt,
    dateModified: p.updatedAt,
    mainEntityOfPage: pageUrl(path),
    ...(p.image ? { image: p.image } : {}),
  };
}

export function faqJsonLd(faq: FaqItem[]) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Minimal schema validity: required fields non-empty. */
export function schemaValid(a: ReturnType<typeof articleJsonLd>, f: ReturnType<typeof faqJsonLd>) {
  const articleOk = !!(a.headline && a.description && a.author.name && a.datePublished && a.dateModified && a.mainEntityOfPage);
  const faqOk = !!f && f.mainEntity.length > 0 && f.mainEntity.every((q) => q.name && q.acceptedAnswer.text);
  return { articleOk, faqOk };
}
