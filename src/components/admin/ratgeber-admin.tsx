// Admin "Ratgeber": AI draft generator, post list, editor with live preview, quality score, versions and cover upload.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Chip, ErrorBox } from "@/components/brand";
import { Button, Input } from "@/components/ui-kit";
import { Textarea } from "@/components/ui/textarea";
import { RatgeberArticle } from "@/components/ratgeber-article";
import { supabase } from "@/integrations/supabase/client";
import {
  blogAdminQuery, createBlogPost, deleteBlogPost, duplicateBlogPost, getBlogVersions, restoreBlogVersion,
  saveBlogPost, saveBlogWordlist, setBlogStatus, uploadBlogCover,
} from "@/lib/content.functions";
import {
  coverFileError, COVER_MAX_BYTES, LENGTHS, MIN_PUBLISH_SCORE, parseFaq, parseLinks, parseSections, parseSources, POST_TYPES, publishBlockers,
  STATUS_LABEL, wordCount, type FaqItem, type InternalLink, type PostStatus, type PostType, type Section, type Source,
} from "@/lib/ratgeber";
import { computeScore, scoreTone, type QualityReport } from "@/lib/ratgeber-score";

type AdminData = Awaited<ReturnType<typeof import("@/lib/content.functions").getBlogAdmin>>;
type Post = AdminData["posts"][number];

/* ---------- AI call (NDJSON stream from the admin-only route) ---------- */
async function callAi<T>(body: unknown, onProgress?: (m: string) => void): Promise<T> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error("Bitte erneut anmelden.");
  const res = await fetch("/api/ratgeber-ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) { let m = "KI-Anfrage fehlgeschlagen."; try { m = ((await res.json()) as { message?: string }).message ?? m; } catch { /* keep */ } throw new Error(m); }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as { type: string; message?: string } & Record<string, unknown>;
      if (ev.type === "progress") onProgress?.(ev.message ?? "");
      if (ev.type === "error") throw new Error(ev.message ?? "KI-Anfrage fehlgeschlagen.");
      if (ev.type === "result") return ev as T;
    }
    if (done) throw new Error("Keine Antwort von der KI erhalten.");
  }
}

/* ---------- image: validate, downscale, convert to WebP ---------- */
async function toWebpBase64(file: File): Promise<string> {
  const err = coverFileError(file); if (err) throw new Error(err);
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bmp.width);
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("Dein Browser kann kein WebP erzeugen.");
  if (blob.size > COVER_MAX_BYTES) throw new Error("Bild ist nach dem Verkleinern noch größer als 2 MB.");
  const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const toneCls = { green: "bg-success", yellow: "bg-warning", red: "bg-danger" } as const;
const statusTone = (s: string) => (s === "published" ? "active" : s === "scheduled" ? "default" : s === "archived" ? "muted" : "warning") as "active" | "default" | "muted" | "warning";
const errText = (e: unknown) => (e instanceof Error ? e.message : "Fehler");

export function RatgeberAdmin() {
  const q = useQuery(blogAdminQuery());
  const [open, setOpen] = useState<string | null>(null);
  if (q.error) return <ErrorBox message={errText(q.error)} />;
  if (!q.data) return <p className="text-ink-muted">Wird geladen …</p>;
  const post = open ? q.data.posts.find((p) => p.id === open) : null;
  if (post) return <Editor key={post.id} p={post} data={q.data} onClose={() => setOpen(null)} onOpen={setOpen} />;
  return (
    <div className="space-y-6">
      <Generator countries={q.data.countries} onCreated={setOpen} />
      <PostList data={q.data} onOpen={setOpen} />
      <Wordlist words={q.data.wordlist} />
    </div>
  );
}

function Generator({ countries, onCreated }: { countries: AdminData["countries"]; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createBlogPost);
  const [f, setF] = useState({ topic: "", keyword: "", country: "", type: "guide" as PostType, length: "normal" as keyof typeof LENGTHS });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr(""); setMsg("Wird gestartet …");
    try {
      const r = await callAi<{ postId: string }>({ mode: "generate", ...f }, setMsg);
      await qc.invalidateQueries({ queryKey: ["admin", "blog"] }); onCreated(r.postId);
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); setMsg(""); }
  };
  return (
    <section className="space-y-3 rounded-[14px] border border-line bg-surface p-4">
      <h3 className="text-lg font-semibold">Beitrag mit KI entwerfen</h3>
      <p className="text-sm text-ink-muted">Die KI erstellt nur einen Entwurf – nie direkt veröffentlicht. Unsichere Stellen werden mit [PRÜFEN] oder [QUELLE FEHLT] markiert.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium md:col-span-2">Titel oder Thema *<Input className="mt-1" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="z. B. eSIM für Japan einrichten" /></label>
        <label className="text-sm font-medium">Fokus-Suchbegriff<Input className="mt-1" value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} placeholder="z. B. eSIM Japan" /></label>
        <label className="text-sm font-medium">Land
          <select className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            <option value="">Kein Land</option>{countries.map((c) => <option key={c.iso} value={c.iso}>{c.name}</option>)}
          </select></label>
        <label className="text-sm font-medium">Beitragstyp
          <select className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as PostType })}>
            {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="text-sm font-medium">Länge
          <select className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value as keyof typeof LENGTHS })}>
            <option value="short">Kurz (ca. 800 Wörter)</option><option value="normal">Normal (ca. 1.400 Wörter)</option><option value="long">Lang (ca. 2.000 Wörter)</option>
          </select></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={go} loading={busy} disabled={busy || f.topic.trim().length < 3}>Entwurf erstellen</Button>
        <Button variant="ghost" disabled={busy} onClick={async () => { const r = await create(); await qc.invalidateQueries({ queryKey: ["admin", "blog"] }); onCreated(r.id); }}>Leeren Beitrag anlegen</Button>
        {msg && <span role="status" className="text-sm text-ink-muted">{msg}</span>}
      </div>
      {err && <ErrorBox message={err} />}
    </section>
  );
}

function PostList({ data, onOpen }: { data: AdminData; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [country, setCountry] = useState(""); const [minScore, setMinScore] = useState(""); const [sort, setSort] = useState("date");
  const list = data.posts
    .filter((p) => (!status || p.status === status) && (!country || p.country_code === country) && (!minScore || (minScore === "low" ? (p.quality_score ?? 0) < 70 : (p.quality_score ?? 0) >= Number(minScore))))
    .filter((p) => !search.trim() || `${p.title} ${p.slug}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === "score" ? (b.quality_score ?? -1) - (a.quality_score ?? -1) : b.updated_at.localeCompare(a.updated_at)));
  const sel = "h-11 rounded-lg border border-line bg-surface px-3 text-sm";
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Beiträge ({data.posts.length})</h3>
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-0 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen" aria-label="Beiträge suchen" />
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Alle Status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land"><option value="">Alle Länder</option>{data.countries.map((c) => <option key={c.iso} value={c.iso}>{c.name}</option>)}</select>
        <select className={sel} value={minScore} onChange={(e) => setMinScore(e.target.value)} aria-label="Score"><option value="">Jeder Score</option><option value="80">ab 80</option><option value="70">ab 70</option><option value="low">unter 70</option></select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortierung"><option value="date">Neueste zuerst</option><option value="score">Bester Score zuerst</option></select>
      </div>
      <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
        {list.length === 0 && <li className="p-4 text-sm text-ink-muted">Keine Beiträge.</li>}
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium [overflow-wrap:anywhere]">{p.title}</div>
              <div className="text-xs text-ink-muted [overflow-wrap:anywhere]">/ratgeber/{p.slug} · geändert {new Date(p.updated_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}{p.status === "scheduled" && p.published_at ? ` · geplant ${new Date(p.published_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Chip tone={statusTone(p.status)}>{STATUS_LABEL[p.status as PostStatus] ?? p.status}</Chip>
              {p.quality_score != null && <span className="flex items-center gap-1 text-sm"><span className={`inline-block size-2.5 rounded-full ${toneCls[scoreTone(p.quality_score)]}`} />{p.quality_score}</span>}
              <Button variant="ghost" onClick={() => onOpen(p.id)}>Bearbeiten</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Wordlist({ words }: { words: string[] }) {
  const qc = useQueryClient(); const save = useServerFn(saveBlogWordlist);
  const [t, setT] = useState(words.join("\n")); const [msg, setMsg] = useState("");
  return (
    <details className="rounded-[14px] border border-line bg-surface p-4">
      <summary className="cursor-pointer font-medium">Wortliste: Superlative und Wettbewerber ({words.length})</summary>
      <p className="mt-2 text-sm text-ink-muted">Ein Begriff pro Zeile. Treffer ziehen in der Qualitätswertung Punkte ab.</p>
      <Textarea className="mt-2" rows={8} value={t} onChange={(e) => setT(e.target.value)} />
      <div className="mt-2 flex items-center gap-3"><Button onClick={async () => { await save({ data: { words: t.split("\n").map((w) => w.trim()).filter((w) => w.length >= 2) } }); await qc.invalidateQueries({ queryKey: ["admin", "blog"] }); setMsg("Gespeichert."); }}>Wortliste speichern</Button>{msg && <span className="text-sm text-success">{msg}</span>}</div>
    </details>
  );
}

/* ---------- Editor ---------- */
type Form = {
  title: string; slug: string; meta_title: string; meta_description: string; answer_summary: string; author_name: string; country_code: string;
  focus_keyword: string; post_type: PostType; target_words: number; cover_url: string; cover_image_alt: string; body: string;
  sections: Section[]; faq: FaqItem[]; sources: Source[]; internal_links: InternalLink[];
};
const fromPost = (p: Post): Form => ({
  title: p.title, slug: p.slug, meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "", answer_summary: p.answer_summary ?? "",
  author_name: p.author_name ?? "", country_code: p.country_code ?? "", focus_keyword: p.focus_keyword ?? "", post_type: (p.post_type as PostType) ?? "guide",
  target_words: p.target_words ?? 1400, cover_url: p.cover_url ?? "", cover_image_alt: p.cover_image_alt ?? "", body: p.body_md ?? "",
  sections: parseSections(p.sections), faq: parseFaq(p.faq), sources: parseSources(p.sources), internal_links: parseLinks(p.internal_links),
});
const nul = (s: string) => s.trim() || null;

function Editor({ p, data, onClose, onOpen }: { p: Post; data: AdminData; onClose: () => void; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveBlogPost); const setStatus = useServerFn(setBlogStatus); const dup = useServerFn(duplicateBlogPost);
  const del = useServerFn(deleteBlogPost); const upload = useServerFn(uploadBlogCover);
  const [f, setF] = useState<Form>(() => fromPost(p));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<"off" | "desktop" | "mobile">("off");
  const [at, setAt] = useState(""); const [reason, setReason] = useState("");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ area: string; suggestion: string }[] | null>(null);
  const [autoState, setAutoState] = useState("");
  const set = (patch: Partial<Form>) => { setF((x) => ({ ...x, ...patch })); setDirty(true); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "blog"] });

  const payload = (autosave: boolean) => ({
    id: p.id, slug: f.slug, title: f.title, meta_title: nul(f.meta_title), meta_description: nul(f.meta_description), answer_summary: nul(f.answer_summary),
    author_name: nul(f.author_name), country_code: nul(f.country_code), focus_keyword: nul(f.focus_keyword), post_type: f.post_type, target_words: f.target_words,
    cover_url: nul(f.cover_url), cover_image_alt: nul(f.cover_image_alt), body: f.body, sections: f.sections, faq: f.faq, sources: f.sources, internal_links: f.internal_links, autosave,
  });
  const doSave = async (autosave: boolean) => {
    const r = await save({ data: payload(autosave) });
    setDirty(false); await refresh();
    if (r.unpublished) setMsg({ ok: false, text: "Beitrag erfüllt die Freigabe-Regeln nicht mehr und wurde auf Entwurf gesetzt." });
    return r;
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { if (dirty) await doSave(false); await fn(); await refresh(); setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };

  // Autosave 4 s after the last change (no version entry).
  const latest = useRef(doSave); latest.current = doSave;
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => { try { setAutoState("Speichert …"); await latest.current(true); setAutoState(`Automatisch gespeichert ${new Date().toLocaleTimeString("de-DE")}`); } catch (e) { setAutoState(`Autospeichern fehlgeschlagen: ${errText(e)}`); } }, 4000);
    return () => clearTimeout(t);
  }, [f, dirty]);

  const report: QualityReport = useMemo(() => computeScore({ ...f, body_md: f.body, published_at: p.published_at, updated_at: new Date().toISOString() }, data.wordlist), [f, data.wordlist, p.published_at]);
  const blockers = publishBlockers({ ...f, body_md: f.body }, report.total, reason);
  const needsReason = report.total < MIN_PUBLISH_SCORE;

  const regenSection = async (i: number) => {
    if (!confirm(`Abschnitt „${f.sections[i]?.heading}“ wird komplett überschrieben (Überschrift und Text). Fortfahren?`)) return;
    setAiBusy(`s${i}`);
    try { if (dirty) await doSave(false); const r = await callAi<{ section: Section }>({ mode: "section", postId: p.id, index: i }); set({ sections: f.sections.map((s, j) => (j === i ? { ...r.section, block: s.block } : s)) }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setAiBusy(null); }
  };
  const regenFaq = async () => {
    if (!confirm(`Alle ${f.faq.length} FAQ-Einträge werden überschrieben. Fortfahren?`)) return;
    setAiBusy("faq");
    try { if (dirty) await doSave(false); const r = await callAi<{ faq: FaqItem[] }>({ mode: "faq", postId: p.id }); set({ faq: r.faq }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setAiBusy(null); }
  };
  const suggest = async () => {
    setAiBusy("suggest");
    try { if (dirty) await doSave(false); const r = await callAi<{ suggestions: { area: string; suggestion: string }[] }>({ mode: "suggest", postId: p.id }); setSuggestions(r.suggestions); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setAiBusy(null); }
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try { const b64 = await toWebpBase64(file); const r = await upload({ data: { id: p.id, webpBase64: b64 } }); set({ cover_url: r.path }); setMsg({ ok: true, text: "Bild hochgeladen (WebP)." }); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  };

  const move = (i: number, d: -1 | 1) => { const s = [...f.sections]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j]!, s[i]!]; set({ sections: s }); };
  const lbl = "block text-sm font-medium";
  const prevPrices = (iso: string) => <div className="rounded-[14px] border border-primary p-4 text-sm text-ink-muted">Live-Tarife {iso} (werden auf der Seite aus dem Tarifangebot geladen)</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={async () => { if (dirty) await doSave(true); onClose(); }}>← Zur Liste</Button>
        <div className="flex items-center gap-2 text-sm text-ink-muted"><Chip tone={statusTone(p.status)}>{STATUS_LABEL[p.status as PostStatus]}</Chip>{autoState}</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4 rounded-[14px] border border-line bg-surface p-4">
          <label className={lbl}>Titel (H1)<Input className="mt-1" value={f.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={lbl}>Slug<Input className="mt-1" value={f.slug} onChange={(e) => set({ slug: e.target.value })} /></label>
            <label className={lbl}>Fokus-Suchbegriff<Input className="mt-1" value={f.focus_keyword} onChange={(e) => set({ focus_keyword: e.target.value })} /></label>
            <label className={lbl}>Meta-Title <span className="text-ink-muted">({f.meta_title.length}/60)</span><Input className="mt-1" value={f.meta_title} onChange={(e) => set({ meta_title: e.target.value })} /></label>
            <label className={lbl}>Autor<Input className="mt-1" value={f.author_name} onChange={(e) => set({ author_name: e.target.value })} placeholder="z. B. GlobeSIM-Team" /></label>
            <label className={lbl}>Land
              <select className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3" value={f.country_code} onChange={(e) => set({ country_code: e.target.value })}>
                <option value="">Kein Land</option>{data.countries.map((c) => <option key={c.iso} value={c.iso}>{c.name}</option>)}
              </select></label>
            <label className={lbl}>Typ / Zielwortzahl
              <div className="mt-1 flex gap-2">
                <select className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3" value={f.post_type} onChange={(e) => set({ post_type: e.target.value as PostType })}>{Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select className="h-11 rounded-lg border border-line bg-surface px-3" value={f.target_words} onChange={(e) => set({ target_words: Number(e.target.value) })}>{Object.values(LENGTHS).map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </div></label>
          </div>
          <label className={lbl}>Meta-Description <span className="text-ink-muted">({f.meta_description.length}, Ziel 120–155)</span><Textarea className="mt-1" rows={2} value={f.meta_description} onChange={(e) => set({ meta_description: e.target.value })} /></label>
          <label className={lbl}>Kurzantwort <span className="text-ink-muted">({wordCount(f.answer_summary)} Wörter, Ziel 40–60)</span><Textarea className="mt-1" rows={3} value={f.answer_summary} onChange={(e) => set({ answer_summary: e.target.value })} /></label>

          <fieldset className="space-y-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium">Titelbild</legend>
            {f.cover_url && <img src={f.cover_url} alt={f.cover_image_alt} className="aspect-[16/9] w-full max-w-sm rounded-lg object-cover" />}
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Titelbild hochladen" onChange={(e) => onFile(e.target.files?.[0])} className="block text-sm" />
            <p className="text-xs text-ink-muted">JPG, PNG oder WebP, max. 2 MB. Wird automatisch verkleinert und als WebP gespeichert.</p>
            <label className={lbl}>Alt-Text *<Input className="mt-1" value={f.cover_image_alt} onChange={(e) => set({ cover_image_alt: e.target.value })} placeholder="Was ist auf dem Bild zu sehen?" /></label>
          </fieldset>

          <label className={lbl}>Einleitung (optional, Markdown)<Textarea className="mt-1 font-mono text-xs" rows={3} value={f.body} onChange={(e) => set({ body: e.target.value })} /></label>
          <p className="text-xs text-ink-muted">Preise nie in den Text schreiben – stattdessen <code>{"{{LIVE_PREISE:TR}}"}</code> als eigenen Absatz. Interne Links: <code>[Text](/countries/turkey)</code>.</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Abschnitte ({f.sections.length})</h4><Button variant="ghost" onClick={() => set({ sections: [...f.sections, { heading: "Neue Überschrift?", level: "h2", body_md: "" }] })}>+ Abschnitt</Button></div>
            {f.sections.map((s, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-line p-3">
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Ebene" className="h-11 rounded-lg border border-line bg-surface px-2" value={s.level} onChange={(e) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, level: e.target.value as "h2" | "h3" } : x)) })}><option value="h2">H2</option><option value="h3">H3</option></select>
                  <Input className="min-w-0 flex-1" aria-label="Überschrift" value={s.heading} onChange={(e) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} />
                </div>
                <Textarea className="font-mono text-xs" rows={6} aria-label="Text" value={s.body_md} onChange={(e) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, body_md: e.target.value } : x)) })} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben">↑</Button>
                  <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === f.sections.length - 1} aria-label="Nach unten">↓</Button>
                  <select aria-label="Zusatzblock" className="h-11 rounded-lg border border-line bg-surface px-2" value={s.block ?? ""} onChange={(e) => set({ sections: f.sections.map((x, j) => (j === i ? { ...x, block: (e.target.value || undefined) as Section["block"] } : x)) })}><option value="">Kein Block</option><option value="plans">Tarife des Landes</option><option value="compat">Kompatibilitätsprüfung</option></select>
                  <Button variant="ghost" loading={aiBusy === `s${i}`} disabled={!!aiBusy} onClick={() => regenSection(i)}>Neu generieren</Button>
                  <Button variant="ghost" onClick={() => confirm("Abschnitt entfernen?") && set({ sections: f.sections.filter((_, j) => j !== i) })}>Entfernen</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">FAQ ({f.faq.length})</h4>
              <div className="flex gap-2"><Button variant="ghost" loading={aiBusy === "faq"} disabled={!!aiBusy} onClick={regenFaq}>FAQ neu generieren</Button><Button variant="ghost" onClick={() => set({ faq: [...f.faq, { q: "Neue Frage?", a: "" }] })}>+ Frage</Button></div></div>
            {f.faq.map((x, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-line p-3">
                <Input aria-label="Frage" value={x.q} onChange={(e) => set({ faq: f.faq.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)) })} />
                <Textarea aria-label="Antwort" rows={3} value={x.a} onChange={(e) => set({ faq: f.faq.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)) })} />
                <div className="flex items-center justify-between text-xs text-ink-muted"><span>{wordCount(x.a)} Wörter</span><button className="underline" onClick={() => set({ faq: f.faq.filter((_, j) => j !== i) })}>Entfernen</button></div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Quellen</h4><Button variant="ghost" onClick={() => set({ sources: [...f.sources, { title: "", url: "https://", accessed_at: new Date().toISOString().slice(0, 10) }] })}>+ Quelle</Button></div>
            <p className="text-xs text-ink-muted">Nur echte Adressen eintragen, die du selbst geprüft hast.</p>
            {f.sources.map((s, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1.4fr_150px_auto]">
                <Input aria-label="Quellentitel" placeholder="Titel" value={s.title} onChange={(e) => set({ sources: f.sources.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)) })} />
                <Input aria-label="URL" value={s.url} onChange={(e) => set({ sources: f.sources.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })} />
                <Input aria-label="Abrufdatum" type="date" value={s.accessed_at} onChange={(e) => set({ sources: f.sources.map((y, j) => (j === i ? { ...y, accessed_at: e.target.value } : y)) })} />
                <Button variant="ghost" onClick={() => set({ sources: f.sources.filter((_, j) => j !== i) })}>✕</Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><h4 className="font-semibold">Interne Link-Vorschläge</h4><Button variant="ghost" onClick={() => set({ internal_links: [...f.internal_links, { label: "", path: "/" }] })}>+ Link</Button></div>
            {f.internal_links.map((l, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <Input aria-label="Linktext" value={l.label} onChange={(e) => set({ internal_links: f.internal_links.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} />
                <Input aria-label="Pfad" value={l.path} onChange={(e) => set({ internal_links: f.internal_links.map((y, j) => (j === i ? { ...y, path: e.target.value } : y)) })} />
                <Button variant="ghost" onClick={() => set({ internal_links: f.internal_links.filter((_, j) => j !== i) })}>✕</Button>
              </div>
            ))}
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <ScorePanel r={report} />
          <div className="space-y-2 rounded-[14px] border border-line bg-surface p-4">
            <Button variant="ghost" loading={aiBusy === "suggest"} disabled={!!aiBusy} onClick={suggest}>KI-Verbesserungsvorschläge</Button>
            <p className="text-xs text-ink-muted">Nur Vorschläge – es wird nichts automatisch geändert.</p>
            {suggestions && (suggestions.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{suggestions.map((s, i) => <li key={i}><strong>{s.area}:</strong> {s.suggestion}</li>)}</ul> : <p className="text-sm">Keine Vorschläge.</p>)}
          </div>

          <div className="space-y-3 rounded-[14px] border border-line bg-surface p-4">
            <h4 className="font-semibold">Aktionen</h4>
            <Button onClick={() => act(() => doSave(false), "Gespeichert (Version angelegt).")} loading={busy} disabled={busy}>Speichern</Button>
            {blockers.length > 0 && <ul className="space-y-1 text-sm text-danger">{blockers.map((b) => <li key={b}>⚠ {b}</li>)}</ul>}
            {needsReason && <label className={lbl}>Begründung, um den Score-Hinweis zu übergehen<Textarea className="mt-1" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mind. 10 Zeichen, wird protokolliert" /></label>}
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || blockers.length > 0} onClick={() => act(() => setStatus({ data: { id: p.id, action: "publish", overrideReason: reason || undefined } }), "Veröffentlicht.")}>Veröffentlichen</Button>
              <Button variant="ghost" disabled={busy} onClick={() => act(() => setStatus({ data: { id: p.id, action: "review" } }), "Zur Prüfung markiert.")}>Zur Prüfung</Button>
              <Button variant="ghost" disabled={busy} onClick={() => act(() => setStatus({ data: { id: p.id, action: "draft" } }), "Zurück auf Entwurf.")}>Auf Entwurf</Button>
              <Button variant="ghost" disabled={busy} onClick={() => act(() => setStatus({ data: { id: p.id, action: "archive" } }), "Archiviert.")}>Archivieren</Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className={lbl}>Planen (Berlin)<Input className="mt-1" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></label>
              <Button variant="ghost" disabled={busy || !at || blockers.length > 0} onClick={() => act(() => setStatus({ data: { id: p.id, action: "schedule", at, overrideReason: reason || undefined } }), "Geplant.")}>Planen</Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button variant="ghost" disabled={busy} onClick={() => act(async () => { const r = await dup({ data: { id: p.id } }); onOpen(r.id); }, "Dupliziert.")}>Duplizieren</Button>
              <Button variant="ghost" disabled={busy} onClick={async () => { if (!confirm(`„${f.title}“ endgültig löschen?`)) return; await del({ data: { id: p.id } }); await refresh(); onClose(); }}>Löschen</Button>
            </div>
            {msg && (msg.ok ? <p role="status" className="text-sm text-success">{msg.text}</p> : <ErrorBox message={msg.text} />)}
          </div>
          <Versions id={p.id} onRestored={async () => { await refresh(); onClose(); onOpen(p.id); }} />
        </aside>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">Live-Vorschau</h4>
          {(["off", "desktop", "mobile"] as const).map((m) => <Button key={m} variant={preview === m ? "primary" : "ghost"} onClick={() => setPreview(m)}>{m === "off" ? "Aus" : m === "desktop" ? "Desktop" : "Mobil (360 px)"}</Button>)}
        </div>
        {preview !== "off" && (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-bg p-4">
            <div className={preview === "mobile" ? "mx-auto w-[360px] max-w-full" : "mx-auto max-w-3xl"}>
              <RatgeberArticle a={{ ...f, body_md: f.body, updated_at: new Date().toISOString(), published_at: p.published_at }} prices={prevPrices} sectionPrices={() => prevPrices(f.country_code || "–")} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ScorePanel({ r }: { r: QualityReport }) {
  const tone = scoreTone(r.total);
  const todo = r.checks.filter((c) => c.state !== "ok");
  const bar = (label: string, v: number) => (
    <div><div className="flex justify-between text-xs"><span>{label}</span><span>{v}</span></div>
      <div className="mt-1 h-2 rounded-full bg-line"><div className={`h-2 rounded-full ${toneCls[scoreTone(v)]}`} style={{ width: `${v}%` }} /></div></div>
  );
  return (
    <div className="space-y-3 rounded-[14px] border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex size-14 items-center justify-center rounded-full text-xl font-bold text-primary-foreground ${toneCls[tone]}`}>{r.total}</span>
        <div><p className="font-semibold">SEO / GEO / KI-Übersicht</p><p className="text-xs text-ink-muted">Qualitätswertung, keine Platzierungsvorhersage</p></div>
      </div>
      {bar("SEO", r.seo)}{bar("GEO / KI-Zitierbarkeit", r.geo)}{bar("Vertrauen / Sicherheit", r.trust)}
      {todo.length > 0 && <div><p className="text-sm font-semibold">Das verbessert den Score</p><ul className="mt-1 space-y-1 text-sm">{todo.map((c) => <li key={c.id}><span className={c.state === "partial" ? "text-warning" : "text-danger"}>{c.state === "partial" ? "◐" : "○"}</span> <strong>{c.label}</strong> – {c.tip}</li>)}</ul></div>}
      <details><summary className="cursor-pointer text-sm">Alle Prüfpunkte</summary><ul className="mt-2 space-y-1 text-xs">{r.checks.map((c) => <li key={c.id}>{c.state === "ok" ? "✓" : c.state === "partial" ? "◐" : "○"} {c.label}</li>)}</ul></details>
    </div>
  );
}

function Versions({ id, onRestored }: { id: string; onRestored: () => void }) {
  const get = useServerFn(getBlogVersions); const restore = useServerFn(restoreBlogVersion);
  const q = useQuery({ queryKey: ["admin", "blog", "versions", id], queryFn: () => get({ data: { id } }) });
  return (
    <details className="rounded-[14px] border border-line bg-surface p-4">
      <summary className="cursor-pointer font-semibold">Versionsverlauf ({q.data?.length ?? 0}/10)</summary>
      <ul className="mt-2 space-y-2 text-sm">
        {q.data?.length === 0 && <li className="text-ink-muted">Noch keine Versionen. Jedes manuelle Speichern legt eine an.</li>}
        {q.data?.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-2">
            <span className="min-w-0 [overflow-wrap:anywhere]">{new Date(v.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}{v.score != null ? ` · Score ${v.score}` : ""}</span>
            <button className="text-primary underline" onClick={async () => { if (!confirm("Diese Version wiederherstellen? Der aktuelle Stand wird vorher als Version gesichert; der Beitrag geht auf Entwurf.")) return; await restore({ data: { id, versionId: v.id } }); onRestored(); }}>Wiederherstellen</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
