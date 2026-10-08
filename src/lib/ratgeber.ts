// Pure rules for Ratgeber (guide) posts: structure, publish guard, JSON-LD.
import { z } from "zod";
import { pageUrl } from "./seo";

export const sectionSchema = z.object({
  heading: z.string().trim().min(3).max(200),
  body_md: z.string().max(20_000).default(""),
  block: z.enum(["plans", "compat"]).optional(),
});
export const faqItemSchema = z.object({ q: z.string().trim().min(3).max(300), a: z.string().trim().min(3).max(2000) });
export type Section = z.infer<typeof sectionSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;

export function parseSections(v: unknown): Section[] {
  const r = z.array(sectionSchema).safeParse(v);
  return r.success ? r.data : [];
}
export function parseFaq(v: unknown): FaqItem[] {
  const r = z.array(faqItemSchema).safeParse(v);
  return r.success ? r.data : [];
}

export type PostDraft = { title: string; meta_title?: string | null; meta_description?: string | null; answer_summary?: string | null; sections: Section[]; faq: FaqItem[] };

/** Everything that blocks publishing. Open [PRÜFEN] markers anywhere keep the post a draft. */
export function publishBlockers(p: PostDraft): string[] {
  const out: string[] = [];
  const all = [p.title, p.meta_title, p.meta_description, p.answer_summary, ...p.sections.flatMap((s) => [s.heading, s.body_md]), ...p.faq.flatMap((f) => [f.q, f.a])].join("\n");
  if (/\[PRÜFEN/i.test(all)) out.push("Offener [PRÜFEN]-Platzhalter im Text.");
  if (p.meta_title && p.meta_title.length > 60) out.push("Meta-Title länger als 60 Zeichen.");
  if (p.meta_description && p.meta_description.length > 155) out.push("Meta-Description länger als 155 Zeichen.");
  if (/beste eSIM|100\s?%\s*Netzabdeckung/i.test(all)) out.push("Unzulässige Superlative im Text.");
  return out;
}

export function wordCount(s: string | null | undefined) {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** Live price block state: never shows fixed prices from text. */
export function planBlockState(plans: { price: number }[] | null | undefined, fixture = false): "plans" | "preparing" {
  return plans && plans.length > 0 && !fixture ? "plans" : "preparing";
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
