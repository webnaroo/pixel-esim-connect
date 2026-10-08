import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Chip, ErrorBox } from "@/components/brand";
import { Button, Input, SegmentedControl } from "@/components/ui-kit";
import { Textarea } from "@/components/ui/textarea";
import { contentAdminQuery, deleteBlogPost, deleteFaq, saveBlogPost, saveCompanyInfo, saveEmailSettings, saveFaq, saveLegalPage } from "@/lib/content.functions";
import { COMPANY_FIELDS, type CompanyInfo } from "@/lib/legal";
import { FAQ_PLACEHOLDERS } from "@/lib/faq-rules";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/content")({ head: () => privateHead("Inhalte verwalten", "Rechtsseiten, Firmendaten, FAQ und Blog im GlobeSIM-Admin."), component: Content, errorComponent: AdminError });

type Data = NonNullable<Awaited<ReturnType<typeof import("@/lib/content.functions").getContentAdmin>>>;
type Sec = "legal" | "company" | "faq" | "blog" | "email";

function useSaver() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setMsg(null);
    try { const t = await fn(); await qc.invalidateQueries({ queryKey: ["admin", "content"] }); setMsg({ ok: true, text: t || "Gespeichert." }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Fehler" }); }
    finally { setBusy(false); }
  };
  const Msg = () => (msg ? (msg.ok ? <p role="status" className="text-sm text-success">{msg.text}</p> : <ErrorBox message={msg.text} />) : null);
  return { run, busy, Msg };
}

function Content() {
  const [sec, setSec] = useState<Sec>("legal");
  const q = useQuery(contentAdminQuery());
  if (q.error) throw q.error;
  return (
    <div className="space-y-6">
      <SegmentedControl label="Inhaltsbereich" value={sec} onChange={setSec} options={[{ value: "legal", label: "Rechtsseiten" }, { value: "company", label: "Firmendaten" }, { value: "faq", label: "FAQ" }, { value: "blog", label: "Blog" }, { value: "email", label: "E-Mail" }]} />
      {!q.data ? <p className="text-ink-muted">Wird geladen …</p> : sec === "legal" ? <Legal d={q.data} /> : sec === "company" ? <Company d={q.data} /> : sec === "faq" ? <Faq d={q.data} /> : sec === "blog" ? <Blog d={q.data} /> : <Email d={q.data} />}
    </div>
  );
}

function Legal({ d }: { d: Data }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-muted">Platzhalter für Firmendaten: {COMPANY_FIELDS.map((f) => `{${f.key}}`).join(" ")}. Nicht freigegebene Seiten sind öffentlich nicht erreichbar.</p>
      {d.legal.map((p) => <LegalEditor key={p.slug} p={p} />)}
    </div>
  );
}

function LegalEditor({ p }: { p: Data["legal"][number] }) {
  const save = useServerFn(saveLegalPage);
  const { run, busy, Msg } = useSaver();
  const [title, setTitle] = useState(p.title);
  const [body, setBody] = useState(p.body_md);
  const submit = (published: boolean) => {
    if (published && !confirm("Seite wirklich freigeben? Sie ist danach öffentlich sichtbar. Bitte nur nach juristischer Prüfung.")) return;
    run(async () => { await save({ data: { slug: p.slug as never, title, body, published } }); return published ? "Freigegeben." : "Gespeichert (nicht veröffentlicht)."; });
  };
  return (
    <section className="space-y-3 rounded-[14px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">{p.title}</h2>
        <div className="flex items-center gap-3">
          <Chip tone={p.published ? "active" : "warning"}>{p.published ? "Freigegeben" : "Platzhalter"}</Chip>
          <Link to="/legal/$slug" params={{ slug: p.slug }} className="text-sm text-primary underline">Ansehen</Link>
        </div>
      </div>
      <label className="block text-sm font-medium">Titel<Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block text-sm font-medium">Text<Textarea className="mt-1 min-h-[200px] font-mono text-sm" value={body} onChange={(e) => setBody(e.target.value)} /></label>
      <Msg />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={busy} onClick={() => submit(false)}>{p.published ? "Freigabe zurücknehmen und speichern" : "Speichern"}</Button>
        {!p.published && <Button loading={busy} onClick={() => submit(true)}>Speichern und freigeben</Button>}
        {p.published && <Button loading={busy} onClick={() => submit(true)}>Speichern</Button>}
      </div>
    </section>
  );
}

function Company({ d }: { d: Data }) {
  const save = useServerFn(saveCompanyInfo);
  const { run, busy, Msg } = useSaver();
  const [v, setV] = useState<CompanyInfo>(d.company);
  return (
    <form className="max-w-xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await save({ data: v as Record<string, string> }); }); }}>
      <p className="text-sm text-ink-muted">Trage hier deine echten Firmendaten ein. Leere Felder erscheinen auf den Rechtsseiten als „[fehlt: …]“.</p>
      {COMPANY_FIELDS.map((f) => (
        <label key={f.key} className="block text-sm font-medium">{f.label}<Input className="mt-1" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /></label>
      ))}
      <Msg />
      <Button type="submit" loading={busy}>Speichern</Button>
    </form>
  );
}

function Faq({ d }: { d: Data }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">Aussagen zu Preisen, Abdeckung und Drosselung nur über Platzhalter: {FAQ_PLACEHOLDERS.join(", ")}. Fehlt der Wert in der Datenbank, wird der Eintrag ausgeblendet.</p>
      <Button onClick={() => setEditing("new")}>Neue Frage</Button>
      {editing === "new" && <FaqEditor onDone={() => setEditing(null)} sort={(d.faqs.at(-1)?.sort_order ?? 0) + 10} />}
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
        {d.faqs.map((f) => (
          <li key={f.id} className="p-4">
            {editing === f.id ? <FaqEditor f={f} onDone={() => setEditing(null)} sort={f.sort_order} /> : (
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-medium">{f.question}</div><div className="text-xs text-ink-muted">{f.category}</div></div>
                <Button variant="ghost" onClick={() => setEditing(f.id)}>Bearbeiten</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqEditor({ f, onDone, sort }: { f?: Data["faqs"][number]; onDone: () => void; sort: number }) {
  const save = useServerFn(saveFaq);
  const del = useServerFn(deleteFaq);
  const { run, busy, Msg } = useSaver();
  const [category, setCategory] = useState(f?.category ?? "Allgemein");
  const [question, setQuestion] = useState(f?.question ?? "");
  const [answer, setAnswer] = useState(f?.answer ?? "");
  const [order, setOrder] = useState(sort);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await save({ data: { id: f?.id, category, question, answer, sort_order: order } }); if (!r.ok) throw new Error(r.errors.join(" ")); onDone(); }); }}>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block text-sm font-medium">Kategorie<Input className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)} /></label>
        <label className="block text-sm font-medium">Reihenfolge<Input className="mt-1" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></label>
      </div>
      <label className="block text-sm font-medium">Frage<Input className="mt-1" value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
      <label className="block text-sm font-medium">Antwort<Textarea className="mt-1 min-h-[120px]" value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
      <Msg />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>Speichern</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Abbrechen</Button>
        {f && <Button type="button" variant="ghost" onClick={() => { if (confirm("Frage löschen?")) run(async () => { await del({ data: { id: f.id } }); onDone(); }); }}>Löschen</Button>}
      </div>
    </form>
  );
}

function Blog({ d }: { d: Data }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}>Neuer Beitrag</Button>
      {editing === "new" && <BlogEditor onDone={() => setEditing(null)} />}
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
        {d.posts.length === 0 && <li className="p-4 text-sm text-ink-muted">Noch keine Beiträge.</li>}
        {d.posts.map((p) => (
          <li key={p.id} className="p-4">
            {editing === p.id ? <BlogEditor p={p} onDone={() => setEditing(null)} /> : (
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-medium">{p.title}</div><div className="text-xs text-ink-muted">/blog/{p.slug} · {p.published_at ? "veröffentlicht" : "Entwurf"}</div></div>
                <Button variant="ghost" onClick={() => setEditing(p.id)}>Bearbeiten</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlogEditor({ p, onDone }: { p?: Data["posts"][number]; onDone: () => void }) {
  const save = useServerFn(saveBlogPost);
  const del = useServerFn(deleteBlogPost);
  const { run, busy, Msg } = useSaver();
  const [title, setTitle] = useState(p?.title ?? "");
  const [slug, setSlug] = useState(p?.slug ?? "");
  const [body, setBody] = useState(p?.body_md ?? "");
  const [published, setPublished] = useState(!!p?.published_at);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await save({ data: { id: p?.id, title, slug, body, published } }); onDone(); }); }}>
      <label className="block text-sm font-medium">Titel<Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block text-sm font-medium">Adresse (Slug)<Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="z-b-esim-tuerkei" /></label>
      <label className="block text-sm font-medium">Text (Markdown)<Textarea className="mt-1 min-h-[200px]" value={body} onChange={(e) => setBody(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Veröffentlicht</label>
      <Msg />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>Speichern</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Abbrechen</Button>
        {p && <Button type="button" variant="ghost" onClick={() => { if (confirm("Beitrag löschen?")) run(async () => { await del({ data: { id: p.id } }); onDone(); }); }}>Löschen</Button>}
      </div>
    </form>
  );
}

function Email({ d }: { d: Data }) {
  const save = useServerFn(saveEmailSettings);
  const { run, busy, Msg } = useSaver();
  const [domain, setDomain] = useState(d.email.sender_domain);
  return (
    <form className="max-w-xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await save({ data: { sender_domain: domain } }); if (!r.ok) throw new Error(r.error); }); }}>
      <div className="flex items-center gap-2"><span className="text-sm">Status:</span><Chip tone={d.email.verified ? "active" : "warning"}>{d.email.verified ? "Verifiziert" : "Nicht verifiziert"}</Chip></div>
      <p className="text-sm text-ink-muted">Solange die Absender-Domain nicht verifiziert ist, gehen keine E-Mails an Kunden. Bestellungen zeigen dann „E-Mail ausstehend“. Die Verifizierung erfolgt bei der Einrichtung des E-Mail-Versands, nicht hier.</p>
      <label className="block text-sm font-medium">Absender-Domain<Input className="mt-1" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="z. B. mail.deinedomain.de" /></label>
      <Msg />
      <Button type="submit" loading={busy}>Speichern</Button>
    </form>
  );
}
