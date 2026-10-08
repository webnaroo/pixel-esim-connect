// Shared Ratgeber article body: used by the public page and the admin live preview.
import { Fragment, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { CompatCheck } from "@/components/compat-check";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { splitLivePrices, type FaqItem, type Section, type Source } from "@/lib/ratgeber";

export type ArticleData = {
  title: string; answer_summary?: string | null; body_md?: string | null; sections: Section[]; faq: FaqItem[]; sources: Source[];
  author_name?: string | null; updated_at: string; published_at?: string | null; cover_url?: string | null; cover_image_alt?: string | null;
};

const fmt = (d: string) => new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

function Rich({ text, prices }: { text: string; prices: (iso: string) => ReactNode }) {
  return <>{splitLivePrices(text).map((p, i) => <Fragment key={i}>{p.kind === "md" ? <Markdown text={p.text} /> : <div className="my-4">{prices(p.iso)}</div>}</Fragment>)}</>;
}

export function RatgeberArticle({ a, prices, sectionPrices, breadcrumb, cta }: { a: ArticleData; prices: (iso: string) => ReactNode; sectionPrices: () => ReactNode; breadcrumb?: ReactNode; cta?: ReactNode }) {
  const toc = a.sections.length >= 4;
  return (
    <article className="min-w-0">
      {breadcrumb}
      <h1 className="mt-4 [overflow-wrap:anywhere]">{a.title}</h1>
      <p className="mt-2 text-xs text-ink-muted">
        {a.author_name ? `Von ${a.author_name} · ` : ""}{a.published_at ? `Veröffentlicht: ${fmt(a.published_at)} · ` : ""}Zuletzt aktualisiert: {fmt(a.updated_at)}
      </p>
      {a.answer_summary && (
        <aside className="mt-6 rounded-[14px] border border-primary p-4" aria-label="Kurz erklärt">
          <p className="text-sm font-semibold">Kurz erklärt</p>
          <p className="mt-1">{a.answer_summary}</p>
        </aside>
      )}
      {a.cover_url && <img src={a.cover_url} alt={a.cover_image_alt ?? ""} className="mt-6 aspect-[16/9] w-full rounded-[14px] object-cover" loading="eager" width={1600} height={900} />}
      {toc && (
        <nav aria-label="Inhaltsverzeichnis" className="mt-6 rounded-[14px] border border-line p-4">
          <p className="text-sm font-semibold">Inhalt</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {a.sections.map((s, i) => <li key={i} className={s.level === "h3" ? "ml-4" : ""}><a href={`#abschnitt-${i + 1}`} className="text-primary underline [overflow-wrap:anywhere]">{s.heading}</a></li>)}
          </ol>
        </nav>
      )}
      {a.body_md?.trim() && <div className="mt-8"><Rich text={a.body_md} prices={prices} /></div>}
      {a.sections.map((s, i) => (
        <section key={i} id={`abschnitt-${i + 1}`} className={s.level === "h3" ? "mt-6 scroll-mt-24" : "mt-10 scroll-mt-24"}>
          {s.level === "h3" ? <h3 className="text-xl">{s.heading}</h3> : <h2 className="text-2xl">{s.heading}</h2>}
          {s.body_md.trim() && <div className="mt-3"><Rich text={s.body_md} prices={prices} /></div>}
          {s.block === "plans" && <div className="mt-4">{sectionPrices()}</div>}
          {s.block === "compat" && <CompatCheck className="mt-4" />}
        </section>
      ))}
      {a.faq.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl">Häufige Fragen</h2>
          <Accordion type="single" collapsible className="mt-3">
            {a.faq.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-ink-muted">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
      {a.sources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl">Quellen</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {a.sources.map((s, i) => <li key={i} className="[overflow-wrap:anywhere]"><a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline">{s.title}</a> <span className="text-ink-muted">(abgerufen am {fmt(s.accessed_at)})</span></li>)}
          </ul>
        </section>
      )}
      {cta && <div className="mt-10 flex flex-col gap-3 sm:flex-row">{cta}</div>}
    </article>
  );
}
